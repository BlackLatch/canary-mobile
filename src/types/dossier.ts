// TypeScript interfaces ported from Canary web reference implementation

export type Address = `0x${string}`;

export interface Dossier {
  id: bigint;
  name: string;
  description?: string;
  isActive: boolean;
  isPermanentlyDisabled?: boolean;
  isReleased?: boolean;
  checkInInterval: bigint; // seconds
  lastCheckIn: bigint; // timestamp
  encryptedFileHashes: string[]; // IPFS CIDs
  recipients: Address[];
  guardians: Address[]; // Guardian addresses for multi-sig release approval
  guardianThreshold: bigint; // Minimum confirmations required (m-of-n)
  guardianConfirmationCount: bigint; // Current number of confirmations
}

// Reference to a dossier owned by another address
export interface DossierReference {
  owner: Address; // Address of the dossier owner
  dossierId: bigint; // ID of the dossier
}

// Extended dossier interface for guardian view with additional metadata
export interface GuardianDossier extends Dossier {
  owner: Address; // Owner of the dossier
  isDecryptable?: boolean; // Whether threshold is met and can be decrypted
  isThresholdMet?: boolean; // Whether guardian approval threshold is met
  hasCurrentUserConfirmed?: boolean; // Whether current user has confirmed
}

// Extended dossier interface for recipient view (private recipients)
export interface RecipientDossier extends Dossier {
  owner: Address; // Owner of the dossier
  isDecryptable?: boolean; // Whether dossier can be decrypted
  isThresholdMet?: boolean; // Whether guardian approval threshold is met
}

// Emergency contact entry stored in localStorage
export interface EmergencyContact {
  id: string; // Unique identifier
  address: Address; // Ethereum address of the contact
  label: string; // User-friendly label
  addedAt: number; // Timestamp when added
}

export interface DeadmanCondition {
  type: 'no_activity' | 'no_checkin' | 'location' | 'keyword';
  duration?: string;
  location?: string;
  keyword?: string;
  timeWindow?: { start: string; end: string };
  dossierId: bigint;
  userAddress: string;
}

export interface TraceJson {
  payload_uri: string; // ipfs://Qm... or codex://...
  taco_capsule_uri: string; // taco://dossier-{id}-{timestamp}
  condition: string; // Human-readable condition description
  description: string; // User description
  storage_type: 'codex' | 'ipfs' | 'pinata';
  gateway_url?: string;
  gatewayUsed?: 'primary' | 'secondary';
  created_at: string; // ISO timestamp
  dossier_id: string;
  user_address: string;
  contract_address: string;
  original_filename: string;
}

export interface EncryptionResult {
  messageKit: any; // TACo messageKit (serialized)
  encryptedData: Uint8Array; // Encrypted file bytes
  originalFileName: string;
  condition: DeadmanCondition;
  description: string;
  capsuleUri: string;
}

export interface CommitResult {
  encryptionResult: EncryptionResult;
  codexCid?: string;
  ipfsCid?: string;
  pinataCid?: string;
  payloadUri: string;
  storageType: 'codex' | 'ipfs' | 'pinata';
}

export interface FileInfo {
  uri: string; // React Native file URI
  name: string;
  size: number;
  type: string;
}

// Manifest file entry - matches web app format exactly for interoperability
export interface DossierManifestFile {
  name: string; // Original filename with extension
  type: string; // MIME type (e.g., "image/jpeg", "application/pdf")
  size: number; // File size in bytes
  encryptedHash: string; // IPFS CID of the encrypted file
  storageUrl: string; // Full IPFS gateway URL to access the encrypted file
}

// Dossier manifest - matches web app format exactly for cross-platform compatibility
export interface DossierManifest {
  version: string; // Manifest format version - must be '1.0' for web app compatibility
  dossierId: string; // ID of the dossier this manifest belongs to
  name: string; // Dossier name
  createdAt: number; // Unix timestamp in seconds (NOT ISO string)
  checkInInterval: number; // Check-in interval in seconds
  releaseMode: 'public' | 'private'; // Release mode - determines encryption strategy
  recipients: string[]; // Array of recipient addresses (for private mode)
  files: DossierManifestFile[]; // Array of file metadata entries
}

export type WalletType = 'burner' | 'walletconnect' | 'embedded';

export interface WalletState {
  type: WalletType | null;
  address: Address | null;
  isConnected: boolean;
  chainId: number | null;
}

// Serializable versions for React Navigation (bigint → string)
export interface SerializableDossier {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  isPermanentlyDisabled?: boolean;
  isReleased?: boolean;
  checkInInterval: string;
  lastCheckIn: string;
  encryptedFileHashes: string[];
  recipients: Address[];
  guardians: Address[];
  guardianThreshold: string;
  guardianConfirmationCount: string;
}

export interface SerializableGuardianDossier extends SerializableDossier {
  owner: Address;
  isDecryptable?: boolean;
  isThresholdMet?: boolean;
  hasCurrentUserConfirmed?: boolean;
}

// Utility functions for navigation serialization
export function serializeDossier(dossier: Dossier): SerializableDossier {
  return {
    ...dossier,
    id: dossier.id.toString(),
    checkInInterval: dossier.checkInInterval.toString(),
    lastCheckIn: dossier.lastCheckIn.toString(),
    guardianThreshold: dossier.guardianThreshold.toString(),
    guardianConfirmationCount: dossier.guardianConfirmationCount.toString(),
  };
}

export function deserializeDossier(serialized: SerializableDossier): Dossier {
  return {
    ...serialized,
    id: BigInt(serialized.id),
    checkInInterval: BigInt(serialized.checkInInterval),
    lastCheckIn: BigInt(serialized.lastCheckIn),
    guardianThreshold: BigInt(serialized.guardianThreshold),
    guardianConfirmationCount: BigInt(serialized.guardianConfirmationCount),
  };
}

export function serializeGuardianDossier(dossier: GuardianDossier): SerializableGuardianDossier {
  return {
    ...serializeDossier(dossier),
    owner: dossier.owner,
    isDecryptable: dossier.isDecryptable,
    isThresholdMet: dossier.isThresholdMet,
    hasCurrentUserConfirmed: dossier.hasCurrentUserConfirmed,
  };
}

export function deserializeGuardianDossier(serialized: SerializableGuardianDossier): GuardianDossier {
  return {
    ...deserializeDossier(serialized),
    owner: serialized.owner,
    isDecryptable: serialized.isDecryptable,
    isThresholdMet: serialized.isThresholdMet,
    hasCurrentUserConfirmed: serialized.hasCurrentUserConfirmed,
  };
}
