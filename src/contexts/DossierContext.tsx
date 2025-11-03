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
import { contractService } from '../lib/contract';
import { encryptFileWithDossier, commitEncryptedFileToPinata } from '../lib/tacoMobile';
import type { CommitResult } from '../lib/tacoMobile';
import type { Dossier, Address, DeadmanCondition, FileInfo, TraceJson } from '../types/dossier';
import { useWallet } from './WalletContext';

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

  // Dossier operations
  loadDossiers: () => Promise<void>;
  createDossier: (
    name: string,
    description: string,
    checkInInterval: bigint,
    recipients: Address[],
    files: FileInfo[]
  ) => Promise<CreateDossierResult>;
  checkIn: (dossierId: bigint) => Promise<OperationResult>;
  checkInAll: () => Promise<OperationResult>;
  pauseDossier: (dossierId: bigint) => Promise<OperationResult>;
  resumeDossier: (dossierId: bigint) => Promise<OperationResult>;
  releaseNow: (dossierId: bigint) => Promise<OperationResult>;
  permanentlyDisable: (dossierId: bigint) => Promise<OperationResult>;

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

  /**
   * Load dossiers when wallet connects
   */
  useEffect(() => {
    if (isConnected && address) {
      loadDossiers();
    } else {
      setDossiers([]);
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
    files: FileInfo[]
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

      // Step 1: Encrypt files with TACo
      const encryptedFiles: CommitResult[] = [];
      const traceJsons: TraceJson[] = [];

      for (const file of files) {
        console.log(`🔐 Encrypting file: ${file.name}`);

        // Read file data
        const fileData = await readFileData(file);

        // Create condition (placeholder - will use actual dossier ID after creation)
        const condition: DeadmanCondition = {
          type: 'no_checkin',
          duration: `${checkInInterval} seconds`,
          dossierId: BigInt(0), // Placeholder, will be updated
          userAddress: address,
        };

        // Encrypt file
        const encryptionResult = await encryptFileWithDossier(
          fileData,
          file.name,
          condition,
          description,
          BigInt(0), // Placeholder dossier ID
          address
        );

        // Upload to Pinata
        const { commitResult, traceJson } = await commitEncryptedFileToPinata(encryptionResult);

        encryptedFiles.push(commitResult);
        traceJsons.push(traceJson);
      }

      // Step 2: Create dossier on-chain with encrypted file hashes
      const encryptedFileHashes = encryptedFiles.map((f) => f.pinataCid);

      const result = await contractService.createDossier(
        name,
        description,
        checkInInterval,
        recipients,
        encryptedFileHashes,
        signer
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
   * Select a dossier for viewing/editing
   */
  const selectDossier = (dossier: Dossier | null) => {
    setSelectedDossier(dossier);
  };

  /**
   * Helper: Read file data from URI
   */
  const readFileData = async (file: FileInfo): Promise<Uint8Array> => {
    // TODO: Implement file reading using react-native-fs
    // For now, return empty array as placeholder
    console.warn('⚠️ File reading not yet implemented');
    return new Uint8Array(0);
  };

  const value: DossierContextState = {
    dossiers,
    isLoading,
    error,
    loadDossiers,
    createDossier,
    checkIn,
    checkInAll,
    pauseDossier,
    resumeDossier,
    releaseNow,
    permanentlyDisable,
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
