/**
 * DossierV2 Contract Integration
 *
 * Provides functions to interact with the DossierV2 smart contract
 * on Status Network Sepolia using ethers.js
 */

import { ethers } from 'ethers';
import { DOSSIER_V2_ADDRESS, DOSSIER_V2_ABI } from '../constants/contracts';
import { STATUS_SEPOLIA } from '../constants/networks';
import type { Dossier, Address } from '../types/dossier';

/**
 * Contract Service for DossierV2
 */
class ContractService {
  private provider: ethers.providers.JsonRpcProvider;

  constructor() {
    this.provider = new ethers.providers.JsonRpcProvider(STATUS_SEPOLIA.rpcUrl);
    console.log('📜 Contract service initialized');
    console.log('📍 Network:', STATUS_SEPOLIA.name);
    console.log('📍 Contract:', DOSSIER_V2_ADDRESS);
  }

  /**
   * Get a contract instance with a signer
   */
  private getContractWithSigner(signer: ethers.Signer): ethers.Contract {
    return new ethers.Contract(DOSSIER_V2_ADDRESS, DOSSIER_V2_ABI, signer);
  }

  /**
   * Get a read-only contract instance
   */
  private getContract(): ethers.Contract {
    return new ethers.Contract(DOSSIER_V2_ADDRESS, DOSSIER_V2_ABI, this.provider);
  }

  /**
   * Create a signer from a wallet provider
   * Supports burner wallets and WalletConnect providers
   */
  async createSigner(walletProvider?: any): Promise<ethers.Signer> {
    if (!walletProvider) {
      throw new Error('Wallet provider is required');
    }

    // If it's already an ethers Wallet (burner wallet)
    if (walletProvider instanceof ethers.Wallet) {
      // Connect to Status Network provider
      return walletProvider.connect(this.provider);
    }

    // If it's a Web3Provider (WalletConnect or other)
    if (walletProvider.getSigner) {
      const web3Provider = new ethers.providers.Web3Provider(walletProvider);
      return web3Provider.getSigner();
    }

    // If it's a raw provider, wrap it
    const web3Provider = new ethers.providers.Web3Provider(walletProvider);
    return web3Provider.getSigner();
  }

  /**
   * READ FUNCTIONS
   */

  /**
   * Get dossier by user address and dossier ID
   */
  async getDossier(userAddress: Address, dossierId: bigint): Promise<Dossier | null> {
    try {
      console.log(`📖 Reading dossier ${dossierId.toString()} for ${userAddress}`);

      const contract = this.getContract();
      const result = await contract.getDossier(userAddress, dossierId);

      // Parse the contract response into our Dossier type
      const dossier: Dossier = {
        id: result.id,
        name: result.name,
        description: result.description,
        isActive: result.isActive,
        isPermanentlyDisabled: result.isPermanentlyDisabled,
        isReleased: result.isReleased,
        checkInInterval: result.checkInInterval,
        lastCheckIn: result.lastCheckIn,
        encryptedFileHashes: result.encryptedFileHashes,
        recipients: result.recipients,
      };

      console.log(`✅ Dossier loaded:`, dossier.name);
      return dossier;
    } catch (error) {
      console.error('❌ Failed to get dossier:', error);
      return null;
    }
  }

  /**
   * Get all dossier IDs for a user
   */
  async getUserDossierIds(userAddress: Address): Promise<bigint[]> {
    try {
      console.log(`📖 Reading dossier IDs for ${userAddress}`);

      const contract = this.getContract();
      const ids = await contract.getUserDossierIds(userAddress);

      console.log(`✅ Found ${ids.length} dossiers`);
      return ids;
    } catch (error) {
      console.error('❌ Failed to get dossier IDs:', error);
      return [];
    }
  }

  /**
   * Get all dossiers for a user
   */
  async getUserDossiers(userAddress: Address): Promise<Dossier[]> {
    try {
      const ids = await this.getUserDossierIds(userAddress);
      const dossiers: Dossier[] = [];

      for (const id of ids) {
        const dossier = await this.getDossier(userAddress, id);
        if (dossier) {
          dossiers.push(dossier);
        }
      }

      return dossiers;
    } catch (error) {
      console.error('❌ Failed to get user dossiers:', error);
      return [];
    }
  }

  /**
   * Check if dossier should stay encrypted
   * This is the function used by TACo conditions
   */
  async shouldDossierStayEncrypted(userAddress: Address, dossierId: bigint): Promise<boolean> {
    try {
      const contract = this.getContract();
      const shouldStayEncrypted = await contract.shouldDossierStayEncrypted(userAddress, dossierId);

      console.log(`🔐 Dossier ${dossierId.toString()} should stay encrypted:`, shouldStayEncrypted);
      return shouldStayEncrypted;
    } catch (error) {
      console.error('❌ Failed to check encryption status:', error);
      return true; // Default to keeping encrypted on error
    }
  }

  /**
   * WRITE FUNCTIONS
   */

  /**
   * Create a new dossier
   */
  async createDossier(
    name: string,
    description: string,
    checkInInterval: bigint,
    recipients: Address[],
    encryptedFileHashes: string[],
    signer: ethers.Signer
  ): Promise<{ success: boolean; dossierId?: bigint; txHash?: string; error?: string }> {
    try {
      console.log('📝 Creating dossier:', name);
      console.log('- Description:', description);
      console.log('- Check-in interval:', checkInInterval.toString(), 'seconds');
      console.log('- Recipients:', recipients.length);
      console.log('- Files:', encryptedFileHashes.length);

      const contract = this.getContractWithSigner(signer);

      // Status Network is fully gasless - explicitly set gas to 0
      console.log('⛽ Using fully gasless transaction (Status Network)');
      console.log('📋 Recipients:', recipients);
      console.log('📋 Recipients array:', JSON.stringify(recipients));

      const tx = await contract.createDossier(
        name,
        description,
        checkInInterval,
        recipients,
        encryptedFileHashes,
        {
          gasLimit: 10000000, // High gas limit for gasless network
          gasPrice: 0, // Fully gasless - no gas price
        }
      );

      console.log('⏳ Transaction sent:', tx.hash);
      console.log('⏳ Waiting for confirmation...');

      const receipt = await tx.wait();
      console.log('✅ Transaction confirmed in block:', receipt.blockNumber);

      // Parse the DossierCreated event to get the dossier ID
      const event = receipt.events?.find((e: any) => e.event === 'DossierCreated');
      const dossierId = event?.args?.dossierId;

      console.log('🎉 Dossier created with ID:', dossierId?.toString());

      return {
        success: true,
        dossierId: dossierId,
        txHash: receipt.transactionHash,
      };
    } catch (error) {
      console.error('❌ Failed to create dossier:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Check in to a dossier
   */
  async checkIn(
    dossierId: bigint,
    signer: ethers.Signer
  ): Promise<{ success: boolean; txHash?: string; error?: string }> {
    try {
      console.log('✓ Checking in to dossier:', dossierId.toString());

      const contract = this.getContractWithSigner(signer);

      const tx = await contract.checkIn(dossierId, {
        gasLimit: 10000000,
        gasPrice: 0,
      });
      console.log('⏳ Transaction sent:', tx.hash);

      const receipt = await tx.wait();
      console.log('✅ Check-in confirmed in block:', receipt.blockNumber);

      return {
        success: true,
        txHash: receipt.transactionHash,
      };
    } catch (error) {
      console.error('❌ Failed to check in:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Check in to all dossiers
   */
  async checkInAll(
    signer: ethers.Signer
  ): Promise<{ success: boolean; txHash?: string; error?: string }> {
    try {
      console.log('✓ Checking in to all dossiers');

      const contract = this.getContractWithSigner(signer);

      const tx = await contract.checkInAll({
        gasLimit: 10000000,
        gasPrice: 0,
      });
      console.log('⏳ Transaction sent:', tx.hash);

      const receipt = await tx.wait();
      console.log('✅ Check-in all confirmed in block:', receipt.blockNumber);

      return {
        success: true,
        txHash: receipt.transactionHash,
      };
    } catch (error) {
      console.error('❌ Failed to check in all:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Pause a dossier
   */
  async pauseDossier(
    dossierId: bigint,
    signer: ethers.Signer
  ): Promise<{ success: boolean; txHash?: string; error?: string }> {
    try {
      console.log('⏸️ Pausing dossier:', dossierId.toString());

      const contract = this.getContractWithSigner(signer);

      const tx = await contract.pauseDossier(dossierId, {
        gasLimit: 10000000,
        gasPrice: 0,
      });
      console.log('⏳ Transaction sent:', tx.hash);

      const receipt = await tx.wait();
      console.log('✅ Dossier paused in block:', receipt.blockNumber);

      return {
        success: true,
        txHash: receipt.transactionHash,
      };
    } catch (error) {
      console.error('❌ Failed to pause dossier:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Resume a dossier
   */
  async resumeDossier(
    dossierId: bigint,
    signer: ethers.Signer
  ): Promise<{ success: boolean; txHash?: string; error?: string }> {
    try {
      console.log('▶️ Resuming dossier:', dossierId.toString());

      const contract = this.getContractWithSigner(signer);

      const tx = await contract.resumeDossier(dossierId, {
        gasLimit: 10000000,
        gasPrice: 0,
      });
      console.log('⏳ Transaction sent:', tx.hash);

      const receipt = await tx.wait();
      console.log('✅ Dossier resumed in block:', receipt.blockNumber);

      return {
        success: true,
        txHash: receipt.transactionHash,
      };
    } catch (error) {
      console.error('❌ Failed to resume dossier:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Release a dossier immediately
   */
  async releaseNow(
    dossierId: bigint,
    signer: ethers.Signer
  ): Promise<{ success: boolean; txHash?: string; error?: string }> {
    try {
      console.log('🚨 Releasing dossier immediately:', dossierId.toString());

      const contract = this.getContractWithSigner(signer);

      const tx = await contract.releaseNow(dossierId, {
        gasLimit: 10000000,
        gasPrice: 0,
      });
      console.log('⏳ Transaction sent:', tx.hash);

      const receipt = await tx.wait();
      console.log('✅ Dossier released in block:', receipt.blockNumber);

      return {
        success: true,
        txHash: receipt.transactionHash,
      };
    } catch (error) {
      console.error('❌ Failed to release dossier:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Permanently disable a dossier
   */
  async permanentlyDisableDossier(
    dossierId: bigint,
    signer: ethers.Signer
  ): Promise<{ success: boolean; txHash?: string; error?: string }> {
    try {
      console.log('🛑 Permanently disabling dossier:', dossierId.toString());

      const contract = this.getContractWithSigner(signer);

      const tx = await contract.permanentlyDisableDossier(dossierId, {
        gasLimit: 10000000,
        gasPrice: 0,
      });
      console.log('⏳ Transaction sent:', tx.hash);

      const receipt = await tx.wait();
      console.log('✅ Dossier permanently disabled in block:', receipt.blockNumber);

      return {
        success: true,
        txHash: receipt.transactionHash,
      };
    } catch (error) {
      console.error('❌ Failed to permanently disable dossier:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Update check-in interval for a dossier
   */
  async updateCheckInInterval(
    dossierId: bigint,
    newInterval: bigint,
    signer: ethers.Signer
  ): Promise<{ success: boolean; txHash?: string; error?: string }> {
    try {
      console.log('⏱️ Updating check-in interval for dossier:', dossierId.toString());
      console.log('⏱️ New interval:', newInterval.toString(), 'seconds');

      const contract = this.getContractWithSigner(signer);

      const tx = await contract.updateCheckInInterval(dossierId, newInterval, {
        gasLimit: 10000000,
        gasPrice: 0,
      });
      console.log('⏳ Transaction sent:', tx.hash);

      const receipt = await tx.wait();
      console.log('✅ Check-in interval updated in block:', receipt.blockNumber);

      return {
        success: true,
        txHash: receipt.transactionHash,
      };
    } catch (error) {
      console.error('❌ Failed to update check-in interval:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Export singleton instance
export const contractService = new ContractService();

// Export convenience functions
export const getDossier = (userAddress: Address, dossierId: bigint) =>
  contractService.getDossier(userAddress, dossierId);

export const getUserDossierIds = (userAddress: Address) =>
  contractService.getUserDossierIds(userAddress);

export const getUserDossiers = (userAddress: Address) =>
  contractService.getUserDossiers(userAddress);

export const shouldDossierStayEncrypted = (userAddress: Address, dossierId: bigint) =>
  contractService.shouldDossierStayEncrypted(userAddress, dossierId);

export const createDossier = (
  name: string,
  description: string,
  checkInInterval: bigint,
  recipients: Address[],
  encryptedFileHashes: string[],
  signer: ethers.Signer
) => contractService.createDossier(name, description, checkInInterval, recipients, encryptedFileHashes, signer);

export const checkIn = (dossierId: bigint, signer: ethers.Signer) =>
  contractService.checkIn(dossierId, signer);

export const checkInAll = (signer: ethers.Signer) =>
  contractService.checkInAll(signer);

export const pauseDossier = (dossierId: bigint, signer: ethers.Signer) =>
  contractService.pauseDossier(dossierId, signer);

export const resumeDossier = (dossierId: bigint, signer: ethers.Signer) =>
  contractService.resumeDossier(dossierId, signer);

export const releaseNow = (dossierId: bigint, signer: ethers.Signer) =>
  contractService.releaseNow(dossierId, signer);

export const permanentlyDisableDossier = (dossierId: bigint, signer: ethers.Signer) =>
  contractService.permanentlyDisableDossier(dossierId, signer);

export const updateCheckInInterval = (dossierId: bigint, newInterval: bigint, signer: ethers.Signer) =>
  contractService.updateCheckInInterval(dossierId, newInterval, signer);
