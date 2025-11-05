/**
 * TACo Mobile wrapper for Canary app
 *
 * This wrapper provides high-level encryption/decryption functions using:
 * - @nucypher/taco-mobile for cryptographic operations
 * - Porter HTTP API for ritual/Ursula coordination
 * - ethers.js for blockchain interactions and signing
 */

import { TacoMobile, EncryptedData, DecryptionRequest, TacoError, hexToBytes, bytesToHex } from '@nucypher/taco-mobile';
import { ethers } from 'ethers';
import { TACO_DOMAIN, RITUAL_ID, TACO_NETWORK_CHAIN_ID } from '../constants/taco';
import { DOSSIER_V2_ADDRESS } from '../constants/contracts';
import { STATUS_SEPOLIA } from '../constants/networks';
import type { DeadmanCondition, EncryptionResult, FileInfo, TraceJson } from '../types/dossier';
import { uploadToPinata, type PinataUploadResult } from './pinata';
import { Buffer } from 'buffer';

// Porter API endpoints
const PORTER_BASE_URL = 'https://porter-lynx.nucypher.io';

/**
 * Porter API types
 */
interface DkgPublicKeyResponse {
  dkg_public_key: string; // hex string
  ritual_id: number;
}

interface DkgParticipant {
  provider: string; // Ursula address
  decryption_request_static_key: string; // hex string
}

interface DkgRitualResponse {
  participants: DkgParticipant[];
  threshold: number;
  dkg_public_key: string;
  ritual_id: number;
}

interface UrsulaDecryptResponse {
  decryption_share: string; // hex string
}

/**
 * Result of committing encrypted data to storage
 */
export interface CommitResult {
  encryptionResult: EncryptionResult;
  pinataCid: string;
  pinataUploadResult: PinataUploadResult;
  payloadUri: string;
  storageType: 'pinata';
}

/**
 * TACo Mobile Service
 * Handles threshold encryption and decryption using taco-mobile library
 */
class TacoMobileService {
  private initialized = false;

  /**
   * Initialize the TACo Mobile library
   */
  async initialize(): Promise<boolean> {
    if (this.initialized) {
      return true;
    }

    try {
      await TacoMobile.initialize();
      this.initialized = true;
      console.log('✅ TACo Mobile initialized');
      return true;
    } catch (error) {
      console.error('❌ TACo Mobile initialization failed:', error);
      return false;
    }
  }

  /**
   * Fetch DKG public key from Coordinator contract on Polygon Amoy
   */
  private async fetchDkgPublicKey(ritualId: number): Promise<Uint8Array> {
    console.log(`🔗 Fetching DKG public key from Coordinator contract for ritual ${ritualId}...`);

    // Connect to Polygon Amoy where TACo infrastructure exists
    const provider = new ethers.providers.JsonRpcProvider('https://rpc-amoy.polygon.technology/');

    // Coordinator contract address on Polygon Amoy (lynx domain)
    const coordinatorAddress = '0xE9e94499bB0f67b9DBD75506ec1735486DE57770';

    // Correct ABI for Lynx Coordinator contract
    // publicKey is a struct (G1Point) with word0 (bytes32) and word1 (bytes16) = 48 bytes total
    const coordinatorAbi = [
      'function rituals(uint256 index) view returns (address initiator, uint32 initTimestamp, uint32 endTimestamp, uint16 totalTranscripts, uint16 totalAggregations, address authority, uint16 dkgSize, uint16 threshold, bool aggregationMismatch, address accessController, tuple(bytes32 word0, bytes16 word1) publicKey, bytes aggregatedTranscript, address feeModel)'
    ];

    const coordinator = new ethers.Contract(coordinatorAddress, coordinatorAbi, provider);

    try {
      const ritual = await coordinator.rituals(ritualId);

      // Combine word0 (32 bytes) and word1 (16 bytes) to get the full 48-byte BLS12-381 G1 point
      const word0 = ethers.utils.arrayify(ritual.publicKey.word0);
      const word1 = ethers.utils.arrayify(ritual.publicKey.word1);
      const publicKeyBytes = new Uint8Array([...word0, ...word1]);

      console.log(`✅ Fetched DKG public key from contract (${publicKeyBytes.length} bytes)`);
      return publicKeyBytes;
    } catch (error) {
      console.error('❌ Failed to fetch DKG public key from contract:', error);
      throw new Error(`Failed to fetch DKG public key from Coordinator contract: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Fetch ritual information from Coordinator contract on Polygon Amoy
   */
  private async fetchRitualInfo(ritualId: number): Promise<DkgRitualResponse> {
    console.log(`🔗 Fetching ritual info from Coordinator contract for ritual ${ritualId}...`);

    // Connect to Polygon Amoy where TACo infrastructure exists
    const provider = new ethers.providers.JsonRpcProvider('https://rpc-amoy.polygon.technology/');

    // Coordinator contract address on Polygon Amoy (lynx domain)
    const coordinatorAddress = '0xE9e94499bB0f67b9DBD75506ec1735486DE57770';

    // ABI with rituals() and getParticipants()
    const coordinatorAbi = [
      'function rituals(uint256 index) view returns (address initiator, uint32 initTimestamp, uint32 endTimestamp, uint16 totalTranscripts, uint16 totalAggregations, address authority, uint16 dkgSize, uint16 threshold, bool aggregationMismatch, address accessController, tuple(bytes32 word0, bytes16 word1) publicKey, bytes aggregatedTranscript, address feeModel)',
      'function getParticipants(uint32 ritualId) view returns (tuple(address provider, bool aggregated, bytes transcript, bytes decryptionRequestStaticKey)[])',
    ];

    const coordinator = new ethers.Contract(coordinatorAddress, coordinatorAbi, provider);

    try {
      // Fetch ritual data and participants from contract
      console.log('📋 Fetching ritual data and participants from contract...');
      const [ritual, participants] = await Promise.all([
        coordinator.rituals(ritualId),
        coordinator.getParticipants(ritualId)
      ]);

      console.log(`✅ Ritual ${ritualId}: threshold=${ritual.threshold}, participants=${participants.length}`);

      // Extract participant info
      const dkgParticipants: DkgParticipant[] = participants.map((p: any) => ({
        provider: p.provider,
        decryption_request_static_key: ethers.utils.hexlify(p.decryptionRequestStaticKey),
      }));

      console.log(`✅ Using ${dkgParticipants.length} participants from contract`);

      // Combine word0 (32 bytes) and word1 (16 bytes) to get the full 48-byte BLS12-381 G1 point
      const word0 = ethers.utils.arrayify(ritual.publicKey.word0);
      const word1 = ethers.utils.arrayify(ritual.publicKey.word1);
      const publicKeyBytes = new Uint8Array([...word0, ...word1]);

      return {
        participants: dkgParticipants,
        threshold: ritual.threshold,
        dkg_public_key: ethers.utils.hexlify(publicKeyBytes),
        ritual_id: ritualId,
      };
    } catch (error) {
      console.error('❌ Failed to fetch ritual info:', error);
      throw new Error(`Failed to fetch ritual info: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create ContractCondition for DossierV2 contract
   * Uses TACo's ContractCondition format with custom function ABI
   */
  private createDossierConditionJson(userAddress: string, dossierId: bigint): string {
    console.log(`🔒 Creating Contract Dossier condition: user=${userAddress}, dossier=${dossierId.toString()}`);
    console.log(`📍 Contract: ${DOSSIER_V2_ADDRESS} on Status Network Sepolia`);

    // Create ContractCondition JSON matching TACo SDK format
    // Reference: https://docs.taco.build/for-developers/taco-sdk/references/conditions/contractcondition/use-custom-contract-calls
    const conditionJson = {
      version: '1.0.0',
      condition: {
        conditionType: 'contract',
        contractAddress: DOSSIER_V2_ADDRESS,
        method: 'shouldDossierStayEncrypted',
        parameters: [
          userAddress,  // User address known at encryption time
          Number(dossierId)  // Pass as number, not string, for uint256 type
        ],
        functionAbi: {
          inputs: [
            { internalType: 'address', name: '_user', type: 'address' },
            { internalType: 'uint256', name: '_dossierId', type: 'uint256' }
          ],
          name: 'shouldDossierStayEncrypted',
          outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
          stateMutability: 'view',
          type: 'function',
          constant: true
        },
        chain: STATUS_SEPOLIA.id,
        returnValueTest: {
          comparator: '==',
          // shouldDossierStayEncrypted returns false when decryption is allowed
          value: false,
        }
      }
    };

    const conditionString = JSON.stringify(conditionJson);
    console.log('📋 Condition JSON:', conditionString);
    return conditionString;
  }

  /**
   * Encrypt file with Dossier contract condition
   */
  async encryptFile(
    fileData: Uint8Array,
    fileName: string,
    condition: DeadmanCondition,
    description: string,
    dossierId: bigint,
    userAddress: string
  ): Promise<EncryptionResult> {
    await this.initialize();

    console.log('🔐 Starting encryption process...');
    console.log(`📁 File: ${fileName} (${fileData.length} bytes)`);
    console.log(`🆔 Dossier ID: ${dossierId.toString()}`);
    console.log(`👤 User: ${userAddress}`);

    // Fetch DKG public key for the ritual
    console.log(`🔑 Fetching DKG public key for ritual ${RITUAL_ID}...`);
    const dkgPublicKey = await this.fetchDkgPublicKey(RITUAL_ID);
    console.log(`✅ DKG public key fetched (${dkgPublicKey.length} bytes)`);

    // Create condition JSON
    const conditionsJson = this.createDossierConditionJson(userAddress, dossierId);
    console.log('📋 Condition JSON:', conditionsJson);

    // Encrypt using taco-mobile
    console.log('🔒 Encrypting with threshold encryption...');
    const encryptedData = await TacoMobile.thresholdEncrypt(
      fileData,
      dkgPublicKey,
      conditionsJson
    );

    // Get MessageKit bytes
    const messageKitBytes = await encryptedData.getMessageKitBytes();
    console.log(`✅ Encryption successful (${messageKitBytes.length} bytes)`);

    // Clean up encrypted data handle
    await encryptedData.destroy();

    // Create enhanced condition with dossier info
    const enhancedCondition = {
      ...condition,
      dossierId,
      userAddress,
    };

    return {
      messageKit: messageKitBytes, // Store as Uint8Array for later decryption
      encryptedData: messageKitBytes,
      originalFileName: fileName,
      condition: enhancedCondition,
      description,
      capsuleUri: `taco://dossier-${dossierId.toString()}-${Date.now()}`,
    };
  }

  /**
   * Decrypt file using threshold decryption
   */
  async decryptFile(messageKitBytes: Uint8Array): Promise<Uint8Array> {
    await this.initialize();

    console.log('🔓 Starting decryption process...');
    console.log(`📦 MessageKit size: ${messageKitBytes.length} bytes`);

    try {
      // Step 1: Load MessageKit bytes into EncryptedData
      console.log('📥 Loading MessageKit bytes...');
      const encryptedData = await EncryptedData.fromMessageKitBytes(messageKitBytes);
      console.log('✅ MessageKit loaded successfully');

      // Step 2: Fetch ritual information
      console.log(`🔍 Fetching ritual info for ritual ${RITUAL_ID}...`);
      const ritualInfo = await this.fetchRitualInfo(RITUAL_ID);
      console.log(`✅ Found ${ritualInfo.participants.length} participants, threshold: ${ritualInfo.threshold}`);

      // Step 3: Create decryption request (generates ephemeral keypair)
      console.log('🔑 Creating decryption request...');
      const request = await encryptedData.createDecryptionRequest(RITUAL_ID);
      console.log('✅ Decryption request created');

      // Step 4: Request decryption shares from Ursulas
      const shares = await this.requestDecryptionShares(
        request,
        ritualInfo.participants,
        ritualInfo.threshold,
        messageKitBytes
      );

      // Step 5: Combine shares to recover plaintext
      console.log(`🔗 Combining ${shares.length} shares...`);
      const plaintext = await request.combineDecryptionShares(shares);
      console.log(`✅ Decryption successful! Plaintext size: ${plaintext.length} bytes`);

      return plaintext;
    } catch (error) {
      console.error('❌ Decryption failed:', error);
      throw error;
    }
  }

  /**
   * Request decryption shares from Ursulas via Porter's /decrypt endpoint
   * This is a helper for the full decryption workflow
   */
  private async requestDecryptionShares(
    request: DecryptionRequest,
    participants: DkgParticipant[],
    threshold: number,
    messageKitBytes: Uint8Array
  ): Promise<Uint8Array[]> {
    console.log(`📨 Creating encrypted requests for ${participants.length} Ursulas...`);
    console.log(`📋 Participant addresses:`, participants.map(p => p.provider));

    // Create encrypted decryption requests for all participants
    // Porter expects a mapping from provider address to encrypted request
    const encryptedRequests: Record<string, string> = {};

    for (const participant of participants) {
      try {
        console.log(`🔐 Creating request for ${participant.provider}...`);
        const ursulaPublicKey = hexToBytes(participant.decryption_request_static_key);
        const encryptedRequest = await request.createEncryptedRequestForUrsula(ursulaPublicKey);

        // Porter expects base64-encoded encrypted requests
        // Convert Uint8Array to base64 using btoa (works in React Native)
        let binaryString = '';
        for (let i = 0; i < encryptedRequest.length; i++) {
          binaryString += String.fromCharCode(encryptedRequest[i]);
        }
        const base64Request = btoa(binaryString);

        encryptedRequests[participant.provider] = base64Request;
        console.log(`✅ Created encrypted request for ${participant.provider}`);
      } catch (error) {
        console.warn(`⚠️ Failed to create request for ${participant.provider}:`, error);
      }
    }

    if (Object.keys(encryptedRequests).length === 0) {
      throw new Error('Failed to create any encrypted requests');
    }

    // Send all requests to Porter's /decrypt endpoint
    console.log(`📨 Sending ${Object.keys(encryptedRequests).length} encrypted requests to Porter...`);

    const requestBody = {
      threshold: threshold,
      encrypted_decryption_requests: encryptedRequests,
    };

    // Add timeout to fetch request (300 seconds / 5 minutes)
    const fetchWithTimeout = (url: string, options: any, timeout = 300000) => {
      return Promise.race([
        fetch(url, options),
        new Promise<Response>((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout after 5 minutes')), timeout)
        )
      ]);
    };

    console.log(`⏳ Waiting for Porter response (this may take a few minutes)...`);
    const response = await fetchWithTimeout(
      `${PORTER_BASE_URL}/decrypt`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    );

    console.log(`📥 Porter responded with status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`❌ Porter error response: ${errorText}`);
      throw new Error(`Porter decrypt failed: ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    console.log(`✅ Porter returned decryption response (full):`, JSON.stringify(data, null, 2));

    // Check for errors in response
    const decryptionResults = data.result?.decryption_results || data;
    if (decryptionResults.errors && Object.keys(decryptionResults.errors).length > 0) {
      console.error('❌ Decryption errors from Ursulas:', JSON.stringify(decryptionResults.errors, null, 2));
    }

    // Decrypt the responses from each Ursula
    const shares: Uint8Array[] = [];

    // Porter returns encrypted responses that we need to decrypt
    const encryptedResponses = decryptionResults.encrypted_decryption_responses || data.encrypted_decryption_responses;
    if (encryptedResponses) {
      console.log(`📦 Processing ${Object.keys(encryptedResponses).length} encrypted responses`);

      // Match each response to the correct participant by address
      for (const participant of participants) {
        const ursulaAddress = participant.provider;
        const encryptedResponseHex = encryptedResponses[ursulaAddress];

        if (!encryptedResponseHex) {
          console.log(`⏭️ No response from ${ursulaAddress}, skipping`);
          continue;
        }

        try {
          console.log(`🔓 Decrypting response from ${ursulaAddress}...`);
          // Porter returns base64-encoded responses
          const encryptedResponse = Uint8Array.from(atob(encryptedResponseHex), c => c.charCodeAt(0));
          const ursulaPublicKey = hexToBytes(participant.decryption_request_static_key);

          const share = await request.decryptUrsulaResponse(encryptedResponse, ursulaPublicKey);
          shares.push(share);
          console.log(`✅ Decrypted share ${shares.length}/${threshold} from ${ursulaAddress}`);

          // Stop once we have enough shares
          if (shares.length >= threshold) {
            console.log(`✅ Collected enough shares (${shares.length}/${threshold})`);
            break;
          }
        } catch (error) {
          console.warn(`⚠️ Failed to decrypt response from ${ursulaAddress}:`, error);
        }
      }
    }

    if (shares.length < threshold) {
      throw new Error(`Failed to collect enough shares: got ${shares.length}, need ${threshold}`);
    }

    return shares.slice(0, threshold);
  }

  /**
   * Commit encrypted file to Pinata IPFS storage
   */
  async commitToPinata(encryptionResult: EncryptionResult): Promise<CommitResult> {
    try {
      console.log('🟣 Uploading to Pinata...');

      const pinataUploadResult = await uploadToPinata(
        encryptionResult.encryptedData,
        `${encryptionResult.originalFileName}.encrypted`
      );

      if (pinataUploadResult.success) {
        console.log('✅ Pinata upload successful:', pinataUploadResult.ipfsHash);
        return {
          encryptionResult,
          pinataCid: pinataUploadResult.ipfsHash,
          pinataUploadResult,
          payloadUri: `ipfs://${pinataUploadResult.ipfsHash}`,
          storageType: 'pinata',
        };
      } else {
        throw new Error(`Pinata upload failed: ${pinataUploadResult.error}`);
      }
    } catch (error) {
      console.error('❌ Pinata upload failed:', error);
      throw new Error(`Storage failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create trace JSON metadata for the encrypted file
   */
  createTraceJson(commitResult: CommitResult): TraceJson {
    const condition = commitResult.encryptionResult.condition;
    const conditionText = this.formatConditionText(condition);

    return {
      payload_uri: commitResult.payloadUri,
      taco_capsule_uri: commitResult.encryptionResult.capsuleUri,
      condition: conditionText,
      description: commitResult.encryptionResult.description || 'Encrypted file with dossier conditions',
      storage_type: commitResult.storageType,
      gateway_url: commitResult.pinataUploadResult.gatewayUrl,
      created_at: new Date().toISOString(),
      // Dossier integration metadata (required)
      dossier_id: condition.dossierId.toString(),
      user_address: condition.userAddress,
      contract_address: DOSSIER_V2_ADDRESS,
      // File metadata
      original_filename: commitResult.encryptionResult.originalFileName,
    };
  }

  /**
   * Format condition as human-readable text
   */
  private formatConditionText(condition: DeadmanCondition): string {
    return `Dossier #${condition.dossierId.toString()} contract verification (${condition.duration || 'contract-defined interval'})`;
  }
}

// Export singleton instance
export const tacoMobileService = new TacoMobileService();

/**
 * High-level encryption function
 */
export async function encryptFileWithDossier(
  fileData: Uint8Array,
  fileName: string,
  condition: DeadmanCondition,
  description: string,
  dossierId: bigint,
  userAddress: string
): Promise<EncryptionResult> {
  return await tacoMobileService.encryptFile(
    fileData,
    fileName,
    condition,
    description,
    dossierId,
    userAddress
  );
}

/**
 * High-level decryption function
 */
export async function decryptFile(messageKitBytes: Uint8Array): Promise<Uint8Array> {
  return await tacoMobileService.decryptFile(messageKitBytes);
}

/**
 * Initialize TACo Mobile
 */
export async function initializeTaco(): Promise<boolean> {
  return await tacoMobileService.initialize();
}

/**
 * Commit encrypted file to Pinata and get trace JSON
 */
export async function commitEncryptedFileToPinata(
  encryptionResult: EncryptionResult
): Promise<{ commitResult: CommitResult; traceJson: TraceJson }> {
  const commitResult = await tacoMobileService.commitToPinata(encryptionResult);
  const traceJson = tacoMobileService.createTraceJson(commitResult);

  return { commitResult, traceJson };
}
