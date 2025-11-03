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

export type WalletType = 'burner' | 'walletconnect' | 'embedded';

export interface WalletState {
  type: WalletType | null;
  address: Address | null;
  isConnected: boolean;
  chainId: number | null;
}
