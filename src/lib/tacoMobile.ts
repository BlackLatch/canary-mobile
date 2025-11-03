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

// Porter API endpoints
const PORTER_BASE_URL = 'https://porter-tapir.nucypher.community';

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
   * Fetch DKG public key from Porter
   */
  private async fetchDkgPublicKey(ritualId: number): Promise<Uint8Array> {
    const response = await fetch(
      `${PORTER_BASE_URL}/rituals/${ritualId}/dkg_public_key`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch DKG public key: ${response.statusText}`);
    }

    const data: DkgPublicKeyResponse = await response.json();
    return hexToBytes(data.dkg_public_key);
  }

  /**
   * Fetch ritual information from Porter
   */
  private async fetchRitualInfo(ritualId: number): Promise<DkgRitualResponse> {
    const response = await fetch(
      `${PORTER_BASE_URL}/rituals/${ritualId}`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch ritual info: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Create RPC condition JSON for DossierV2 contract
   * This mimics the taco-web RpcCondition but as JSON format
   */
  private createDossierConditionJson(userAddress: string, dossierId: bigint): string {
    console.log(`🔒 Creating RPC Dossier condition: user=${userAddress}, dossier=${dossierId.toString()}`);
    console.log(`📍 Contract: ${DOSSIER_V2_ADDRESS} on Status Network Sepolia`);

    // Encode function call: shouldDossierStayEncrypted(address,uint256)
    const functionSelector = ethers.utils.id('shouldDossierStayEncrypted(address,uint256)').slice(0, 10);
    const encodedParams = ethers.utils.defaultAbiCoder.encode(
      ['address', 'uint256'],
      [userAddress, dossierId.toString()]
    ).slice(2);
    const callData = functionSelector + encodedParams;

    // Create RPC condition JSON matching taco-web format
    const condition = {
      version: '1.0.0',
      condition: {
        conditionType: 'rpc',
        chain: STATUS_SEPOLIA.id,
        method: 'eth_call',
        parameters: [
          {
            to: DOSSIER_V2_ADDRESS,
            data: callData,
          },
          'latest',
        ],
        returnValueTest: {
          comparator: '==',
          // shouldDossierStayEncrypted returns false (0x0...0) when decryption is allowed
          value: '0x0000000000000000000000000000000000000000000000000000000000000000',
        },
      },
      // Add RPC endpoint for Status Network
      ':rpcEndpoint': STATUS_SEPOLIA.rpcUrl,
    };

    return JSON.stringify(condition);
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
      // Fetch ritual information
      console.log(`🔍 Fetching ritual info for ritual ${RITUAL_ID}...`);
      const ritualInfo = await this.fetchRitualInfo(RITUAL_ID);
      console.log(`✅ Found ${ritualInfo.participants.length} participants, threshold: ${ritualInfo.threshold}`);

      // Create EncryptedData from messageKit bytes
      // Note: We need to re-encrypt to create the handle, or we need to extend taco-mobile
      // to support creating EncryptedData from existing MessageKit bytes
      // For now, we'll use a workaround by fetching the DKG key and creating a dummy encryption
      // This is a limitation of the current taco-mobile API

      // TODO: This is a placeholder - taco-mobile needs to support deserializing MessageKit
      // For now, we'll throw an error indicating this needs to be implemented
      throw new Error('Decryption from MessageKit bytes requires taco-mobile API extension');

      // The proper flow would be:
      // 1. Create EncryptedData from messageKitBytes
      // 2. Create decryption request
      // 3. For each Ursula, create encrypted request
      // 4. Submit requests to Porter
      // 5. Collect and decrypt responses
      // 6. Combine shares to recover plaintext

    } catch (error) {
      console.error('❌ Decryption failed:', error);
      throw error;
    }
  }

  /**
   * Request decryption shares from Ursulas via Porter
   * This is a helper for the full decryption workflow
   */
  private async requestDecryptionShares(
    request: DecryptionRequest,
    participants: DkgParticipant[],
    threshold: number,
    messageKitBytes: Uint8Array
  ): Promise<Uint8Array[]> {
    console.log(`📨 Requesting decryption shares from ${participants.length} Ursulas...`);

    const shares: Uint8Array[] = [];

    for (const participant of participants) {
      try {
        // Create encrypted request for this Ursula
        const ursulaPublicKey = hexToBytes(participant.decryption_request_static_key);
        const encryptedRequest = await request.createEncryptedRequestForUrsula(ursulaPublicKey);

        // Submit to Ursula via Porter
        const response = await fetch(
          `${PORTER_BASE_URL}/retrieve_cfrags`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              ritual_id: RITUAL_ID,
              encrypted_request: bytesToHex(encryptedRequest),
              message_kit: bytesToHex(messageKitBytes),
            }),
          }
        );

        if (!response.ok) {
          console.warn(`⚠️ Ursula ${participant.provider} failed: ${response.statusText}`);
          continue;
        }

        const data: UrsulaDecryptResponse = await response.json();

        // Decrypt Ursula's response
        const encryptedResponse = hexToBytes(data.decryption_share);
        const share = await request.decryptUrsulaResponse(encryptedResponse, ursulaPublicKey);

        shares.push(share);
        console.log(`✅ Got share ${shares.length}/${threshold} from ${participant.provider}`);

        // Stop once we have enough shares
        if (shares.length >= threshold) {
          break;
        }
      } catch (error) {
        console.warn(`⚠️ Error requesting from ${participant.provider}:`, error);
        continue;
      }
    }

    if (shares.length < threshold) {
      throw new Error(`Failed to collect enough shares: got ${shares.length}, need ${threshold}`);
    }

    return shares;
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
