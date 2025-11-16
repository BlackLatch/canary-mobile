/**
 * DossierContext - Dossier state management
 *
 * Provides centralized state management for dossiers:
 * - Loading user's dossiers
 * - Creating new dossiers
 * - Checking in to dossiers
 * - Managing dossier lifecycle
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import RNFS from 'react-native-fs';
import { contractService } from '../lib/contract';
import { encryptFileWithDossier, commitEncryptedFileToPinata } from '../lib/tacoMobile';
import type { CommitResult } from '../lib/tacoMobile';
import type { Dossier, Address, DeadmanCondition, FileInfo, TraceJson, DossierManifest, DossierManifestFile, GuardianDossier, DossierReference } from '../types/dossier';
import { useWallet } from './WalletContext';
import { PINATA_CONFIG } from '../constants/taco';

// Operation result types
interface CreateDossierResult {
  success: boolean;
  dossierId?: bigint;
  error?: string;
}

interface OperationResult {
  success: boolean;
  error?: string;
}

interface DossierContextState {
  // Dossier state
  dossiers: Dossier[];
  isLoading: boolean;
  error: string | null;

  // Guardian state
  guardianDossiers: GuardianDossier[];
  guardianDossiersLoading: boolean;

  // Dossier operations
  loadDossiers: () => Promise<void>;
  refreshDossiers: () => Promise<void>;
  createDossier: (
    name: string,
    description: string,
    checkInInterval: bigint,
    recipients: Address[],
    files: FileInfo[],
    guardians?: Address[],
    guardianThreshold?: number
  ) => Promise<CreateDossierResult>;
  checkIn: (dossierId: bigint) => Promise<OperationResult>;
  checkInAll: () => Promise<OperationResult>;
  pauseDossier: (dossierId: bigint) => Promise<OperationResult>;
  resumeDossier: (dossierId: bigint) => Promise<OperationResult>;
  updateSchedule: (dossierId: bigint, newInterval: bigint) => Promise<OperationResult>;
  releaseNow: (dossierId: bigint) => Promise<OperationResult>;
  permanentlyDisable: (dossierId: bigint) => Promise<OperationResult>;

  // Guardian operations
  loadGuardianDossiers: () => Promise<void>;
  confirmRelease: (ownerAddress: Address, dossierId: bigint) => Promise<OperationResult>;

  // Selected dossier
  selectedDossier: Dossier | null;
  selectDossier: (dossier: Dossier | null) => void;
}

const DossierContext = createContext<DossierContextState | undefined>(undefined);

interface DossierProviderProps {
  children: ReactNode;
}

export const DossierProvider: React.FC<DossierProviderProps> = ({ children }) => {
  const { address, isConnected, getSigner } = useWallet();
  const [dossiers, setDossiers] = useState<Dossier[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDossier, setSelectedDossier] = useState<Dossier | null>(null);

  // Guardian state
  const [guardianDossiers, setGuardianDossiers] = useState<GuardianDossier[]>([]);
  const [guardianDossiersLoading, setGuardianDossiersLoading] = useState(false);

  /**
   * Load dossiers when wallet connects
   */
  useEffect(() => {
    if (isConnected && address) {
      loadDossiers();
      loadGuardianDossiers();
    } else {
      setDossiers([]);
      setGuardianDossiers([]);
      setSelectedDossier(null);
    }
  }, [isConnected, address]);

  /**
   * Load user's dossiers from contract
   */
  const loadDossiers = async () => {
    if (!address) {
      console.warn('⚠️ No address connected');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      console.log('📖 Loading dossiers for:', address);

      const userDossiers = await contractService.getUserDossiers(address);
      setDossiers(userDossiers);

      console.log(`✅ Loaded ${userDossiers.length} dossiers`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load dossiers';
      setError(errorMessage);
      console.error('❌ Failed to load dossiers:', err);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Create a new dossier with encrypted files
   */
  const createDossier = async (
    name: string,
    description: string,
    checkInInterval: bigint,
    recipients: Address[],
    files: FileInfo[],
    guardians: Address[] = [],
    guardianThreshold: number = 0
  ): Promise<CreateDossierResult> => {
    if (!address) {
      return { success: false, error: 'No wallet connected' };
    }

    try {
      setIsLoading(true);
      setError(null);
      console.log('📝 Creating dossier:', name);

      // Get signer
      const signer = await getSigner();
      if (!signer) {
        return { success: false, error: 'Failed to get signer' };
      }

      // Step 1: Get next dossier ID by querying current user dossiers
      console.log('🔍 Querying for next dossier ID...');
      const currentDossierIds = await contractService.getUserDossierIds(address);
      const nextDossierId = BigInt(currentDossierIds.length);
      console.log(`📋 Next dossier ID will be: ${nextDossierId.toString()}`);

      // Step 2: Encrypt files with TACo using the predicted dossier ID
      const encryptedFiles: CommitResult[] = [];
      const traceJsons: TraceJson[] = [];

      // Determine release mode based on recipients BEFORE encryption
      // Public release: no recipients specified (will default to user's address on-chain)
      // Private release: specific recipients provided
      const releaseMode: 'public' | 'private' = recipients.length === 0 ? 'public' : 'private';
      console.log(`🔓 Release Mode: ${releaseMode}`);

      for (const file of files) {
        console.log(`🔐 Encrypting file: ${file.name}`);

        // Read file data
        const fileData = await readFileData(file);

        // Create condition with the actual dossier ID
        const condition: DeadmanCondition = {
          type: 'no_checkin',
          duration: `${checkInInterval} seconds`,
          dossierId: nextDossierId,
          userAddress: address,
        };

        // Encrypt file with the correct dossier ID and release mode
        // Private release: uses CompoundCondition with recipient check
        // Public release: uses simple ContractCondition
        const encryptionResult = await encryptFileWithDossier(
          fileData,
          file.name,
          condition,
          description,
          nextDossierId,
          address,
          releaseMode,
          recipients
        );

        // Upload to Pinata
        const { commitResult, traceJson } = await commitEncryptedFileToPinata(encryptionResult);

        encryptedFiles.push(commitResult);
        traceJsons.push(traceJson);
      }

      // Step 2.5: Build and encrypt manifest with file metadata
      // Manifest format matches web app for cross-platform compatibility
      console.log('📋 Building manifest with file metadata...');

      const manifestFiles: DossierManifestFile[] = files.map((file, index) => {
        const cid = encryptedFiles[index].pinataCid!;
        return {
          name: file.name,
          type: file.type || 'application/octet-stream',
          size: file.size,
          encryptedHash: cid,
          storageUrl: `${PINATA_CONFIG.gateway}/ipfs/${cid}`,
        };
      });

      const manifest: DossierManifest = {
        version: '1.0', // Must be '1.0' for web app compatibility
        dossierId: nextDossierId.toString(),
        name: name, // Dossier name
        createdAt: Math.floor(Date.now() / 1000), // Unix timestamp in seconds
        checkInInterval: Number(checkInInterval), // Convert bigint to number (seconds)
        releaseMode: releaseMode,
        recipients: recipients, // Array of recipient addresses
        files: manifestFiles,
      };

      // Encrypt manifest as JSON file
      console.log('🔐 Encrypting manifest...');
      const manifestJson = JSON.stringify(manifest);
      const manifestBytes = new TextEncoder().encode(manifestJson);

      const manifestCondition: DeadmanCondition = {
        type: 'no_checkin',
        duration: `${checkInInterval} seconds`,
        dossierId: nextDossierId,
        userAddress: address,
      };

      // Encrypt manifest with the same release mode as the files
      const manifestEncryptionResult = await encryptFileWithDossier(
        manifestBytes,
        'manifest.json',
        manifestCondition,
        `Manifest for ${name}`,
        nextDossierId,
        address,
        releaseMode,
        recipients
      );

      const { commitResult: manifestCommit } = await commitEncryptedFileToPinata(manifestEncryptionResult);
      console.log('✅ Manifest encrypted and uploaded:', manifestCommit.pinataCid);

      // Step 3: Create dossier on-chain with manifest hash first, then file hashes
      const encryptedFileHashes = [
        manifestCommit.pinataCid!, // Manifest always at index 0
        ...encryptedFiles.map((f) => f.pinataCid!)
      ];

      // Step 4: Create dossier on-chain
      // IMPORTANT: Contract requires at least one recipient (the owner)
      // For public releases: include only user's own address
      // For private releases: include user's address + specified recipients
      const finalRecipients = [address, ...recipients]; // Always include user, then add additional recipients
      console.log(`📋 Final recipients (${releaseMode}):`, recipients.length === 0 ? `Public - Owner only [${address}]` : `Private - Owner + ${recipients.length} contacts`);

      const result = await contractService.createDossier(
        name,
        description,
        checkInInterval,
        finalRecipients,
        encryptedFileHashes,
        signer,
        guardians,
        guardianThreshold
      );

      if (result.success && result.dossierId) {
        console.log('🎉 Dossier created successfully:', result.dossierId.toString());

        // Reload dossiers
        await loadDossiers();

        return { success: true, dossierId: result.dossierId };
      } else {
        return { success: false, error: result.error };
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create dossier';
      setError(errorMessage);
      console.error('❌ Failed to create dossier:', err);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Check in to a dossier
   */
  const checkIn = async (dossierId: bigint): Promise<OperationResult> => {
    try {
      setIsLoading(true);
      setError(null);
      console.log('✓ Checking in to dossier:', dossierId.toString());

      const signer = await getSigner();
      if (!signer) {
        return { success: false, error: 'Failed to get signer' };
      }

      const result = await contractService.checkIn(dossierId, signer);

      if (result.success) {
        console.log('✅ Check-in successful');
        // Reload dossiers to update lastCheckIn timestamp
        await loadDossiers();
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to check in';
      setError(errorMessage);
      console.error('❌ Failed to check in:', err);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Check in to all dossiers
   */
  const checkInAll = async (): Promise<OperationResult> => {
    try {
      setIsLoading(true);
      setError(null);
      console.log('✓ Checking in to all dossiers');

      const signer = await getSigner();
      if (!signer) {
        return { success: false, error: 'Failed to get signer' };
      }

      const result = await contractService.checkInAll(signer);

      if (result.success) {
        console.log('✅ Check-in all successful');
        await loadDossiers();
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to check in all';
      setError(errorMessage);
      console.error('❌ Failed to check in all:', err);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Pause a dossier
   */
  const pauseDossier = async (dossierId: bigint): Promise<OperationResult> => {
    try {
      setIsLoading(true);
      setError(null);

      const signer = await getSigner();
      if (!signer) {
        return { success: false, error: 'Failed to get signer' };
      }

      const result = await contractService.pauseDossier(dossierId, signer);

      if (result.success) {
        await loadDossiers();
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to pause dossier';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Resume a dossier
   */
  const resumeDossier = async (dossierId: bigint): Promise<OperationResult> => {
    try {
      setIsLoading(true);
      setError(null);

      const signer = await getSigner();
      if (!signer) {
        return { success: false, error: 'Failed to get signer' };
      }

      const result = await contractService.resumeDossier(dossierId, signer);

      if (result.success) {
        await loadDossiers();
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to resume dossier';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Release a dossier immediately
   */
  const releaseNow = async (dossierId: bigint): Promise<OperationResult> => {
    try {
      setIsLoading(true);
      setError(null);

      const signer = await getSigner();
      if (!signer) {
        return { success: false, error: 'Failed to get signer' };
      }

      const result = await contractService.releaseNow(dossierId, signer);

      if (result.success) {
        await loadDossiers();
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to release dossier';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Permanently disable a dossier
   */
  const permanentlyDisable = async (dossierId: bigint): Promise<OperationResult> => {
    try {
      setIsLoading(true);
      setError(null);

      const signer = await getSigner();
      if (!signer) {
        return { success: false, error: 'Failed to get signer' };
      }

      const result = await contractService.permanentlyDisableDossier(dossierId, signer);

      if (result.success) {
        await loadDossiers();
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to disable dossier';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Update check-in schedule for a dossier
   */
  const updateSchedule = async (dossierId: bigint, newInterval: bigint): Promise<OperationResult> => {
    try {
      setIsLoading(true);
      setError(null);

      const signer = await getSigner();
      if (!signer) {
        return { success: false, error: 'Failed to get signer' };
      }

      const result = await contractService.updateCheckInInterval(dossierId, newInterval, signer);

      if (result.success) {
        await loadDossiers();
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update schedule';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Load dossiers where current user is a guardian
   */
  const loadGuardianDossiers = async () => {
    if (!address) {
      console.warn('⚠️ No address connected');
      return;
    }

    try {
      setGuardianDossiersLoading(true);
      console.log('🛡️ Loading guardian dossiers for:', address);

      // Get all dossiers where user is a guardian
      const references = await contractService.getDossiersWhereGuardian(address);
      console.log(`📋 Found ${references.length} dossiers where user is guardian`);

      // Fetch full dossier details for each reference
      const guardianDossiersData: GuardianDossier[] = [];

      for (const ref of references) {
        try {
          const dossier = await contractService.getDossier(ref.owner, ref.dossierId);

          if (dossier) {
            // Check if time-expired
            const now = BigInt(Math.floor(Date.now() / 1000));
            const expiresAt = dossier.lastCheckIn + dossier.checkInInterval;
            const isExpired = now > expiresAt;

            // Check if threshold is met
            const isThresholdMet = await contractService.isGuardianThresholdMet(ref.owner, ref.dossierId);

            // Check if current user has confirmed
            const hasCurrentUserConfirmed = await contractService.hasGuardianConfirmed(
              ref.owner,
              ref.dossierId,
              address
            );

            // Determine if decryptable (expired AND threshold met)
            const isDecryptable = isExpired && isThresholdMet;

            guardianDossiersData.push({
              ...dossier,
              owner: ref.owner,
              isDecryptable,
              isThresholdMet,
              hasCurrentUserConfirmed,
            });
          }
        } catch (err) {
          console.error(`❌ Failed to load dossier ${ref.dossierId.toString()}:`, err);
        }
      }

      // Sort by status: expired & awaiting confirmation first
      guardianDossiersData.sort((a, b) => {
        const aExpired = !a.isActive && !a.isThresholdMet;
        const bExpired = !b.isActive && !b.isThresholdMet;

        if (aExpired && !bExpired) return -1;
        if (!aExpired && bExpired) return 1;
        return 0;
      });

      setGuardianDossiers(guardianDossiersData);
      console.log(`✅ Loaded ${guardianDossiersData.length} guardian dossiers`);
    } catch (err) {
      console.error('❌ Failed to load guardian dossiers:', err);
    } finally {
      setGuardianDossiersLoading(false);
    }
  };

  /**
   * Confirm release as a guardian
   */
  const confirmRelease = async (ownerAddress: Address, dossierId: bigint): Promise<OperationResult> => {
    try {
      setGuardianDossiersLoading(true);

      const signer = await getSigner();
      if (!signer) {
        return { success: false, error: 'Failed to get signer' };
      }

      console.log(`🛡️ Confirming release for dossier ${dossierId.toString()}`);

      const result = await contractService.confirmRelease(ownerAddress, dossierId, signer);

      if (result.success) {
        console.log('✅ Release confirmed successfully');

        // Reload guardian dossiers to reflect the change
        await loadGuardianDossiers();

        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to confirm release';
      console.error('❌ Failed to confirm release:', err);
      return { success: false, error: errorMessage };
    } finally {
      setGuardianDossiersLoading(false);
    }
  };

  /**
   * Select a dossier for viewing/editing
   */
  const selectDossier = (dossier: Dossier | null) => {
    setSelectedDossier(dossier);
  };

  /**
   * Helper: Read file data from URI
   */
  const readFileData = async (file: FileInfo): Promise<Uint8Array> => {
    try {
      console.log(`📂 Reading file: ${file.name} (${file.size} bytes)`);
      console.log(`📍 URI: ${file.uri}`);

      let filePath = file.uri;

      // Handle different URI schemes
      // Android: content:// URIs (from document picker)
      // iOS: file:// URIs or absolute paths
      if (filePath.startsWith('content://')) {
        // Android content URI - use directly with RNFS
        console.log('📱 Detected Android content URI');
      } else if (filePath.startsWith('file://')) {
        // iOS file URI - remove prefix
        filePath = filePath.substring(7);
        console.log('🍎 Detected iOS file URI');
      }

      // For content:// URIs, RNFS handles them directly
      // For file paths, check if exists first
      if (!filePath.startsWith('content://')) {
        const exists = await RNFS.exists(filePath);
        if (!exists) {
          throw new Error(`File not found at path: ${filePath}`);
        }
      }

      // Read file as base64
      const base64Data = await RNFS.readFile(filePath, 'base64');

      // Convert base64 to Uint8Array
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      console.log(`✅ File read successfully: ${bytes.length} bytes`);
      return bytes;
    } catch (error) {
      console.error(`❌ Failed to read file ${file.name}:`, error);
      throw new Error(`Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const value: DossierContextState = {
    dossiers,
    isLoading,
    error,
    guardianDossiers,
    guardianDossiersLoading,
    loadDossiers,
    refreshDossiers: loadDossiers,
    createDossier,
    checkIn,
    checkInAll,
    pauseDossier,
    resumeDossier,
    updateSchedule,
    releaseNow,
    permanentlyDisable,
    loadGuardianDossiers,
    confirmRelease,
    selectedDossier,
    selectDossier,
  };

  return <DossierContext.Provider value={value}>{children}</DossierContext.Provider>;
};

/**
 * Hook to use dossier context
 */
export const useDossier = (): DossierContextState => {
  const context = useContext(DossierContext);
  if (context === undefined) {
    throw new Error('useDossier must be used within a DossierProvider');
  }
  return context;
};
