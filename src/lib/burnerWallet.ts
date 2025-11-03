/**
 * Burner Wallet Implementation
 *
 * Provides anonymous, client-side generated wallets stored in AsyncStorage.
 * These wallets are ephemeral and intended for privacy-focused use cases.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { ethers } from 'ethers';

const BURNER_WALLET_KEY = '@canary:burner_wallet';
const BURNER_WALLET_ENCRYPTED_KEY = '@canary:burner_wallet_encrypted';

/**
 * Burner Wallet Service
 */
class BurnerWalletService {
  private wallet: ethers.Wallet | null = null;

  /**
   * Check if a burner wallet exists in storage
   */
  async hasWallet(): Promise<boolean> {
    try {
      const privateKey = await AsyncStorage.getItem(BURNER_WALLET_KEY);
      return privateKey !== null;
    } catch (error) {
      console.error('❌ Error checking for burner wallet:', error);
      return false;
    }
  }

  /**
   * Create a new burner wallet
   */
  async createWallet(password?: string): Promise<ethers.Wallet> {
    console.log('🔥 Creating new burner wallet...');

    // Generate random wallet
    const wallet = ethers.Wallet.createRandom();

    // Store the private key
    if (password) {
      // Encrypt with password
      const encrypted = await wallet.encrypt(password);
      await AsyncStorage.setItem(BURNER_WALLET_ENCRYPTED_KEY, encrypted);
      console.log('🔒 Burner wallet encrypted and stored');
    } else {
      // Store unencrypted (less secure but simpler)
      await AsyncStorage.setItem(BURNER_WALLET_KEY, wallet.privateKey);
      console.log('🔓 Burner wallet stored (unencrypted)');
    }

    this.wallet = wallet;

    console.log('✅ Burner wallet created');
    console.log('📍 Address:', wallet.address);

    return wallet;
  }

  /**
   * Load burner wallet from storage
   */
  async loadWallet(password?: string): Promise<ethers.Wallet | null> {
    try {
      console.log('🔥 Loading burner wallet...');

      // Try encrypted first
      if (password) {
        const encrypted = await AsyncStorage.getItem(BURNER_WALLET_ENCRYPTED_KEY);
        if (encrypted) {
          console.log('🔓 Decrypting wallet...');
          const wallet = await ethers.Wallet.fromEncryptedJson(encrypted, password);
          this.wallet = wallet;
          console.log('✅ Burner wallet loaded (encrypted)');
          console.log('📍 Address:', wallet.address);
          return wallet;
        }
      }

      // Try unencrypted
      const privateKey = await AsyncStorage.getItem(BURNER_WALLET_KEY);
      if (privateKey) {
        const wallet = new ethers.Wallet(privateKey);
        this.wallet = wallet;
        console.log('✅ Burner wallet loaded (unencrypted)');
        console.log('📍 Address:', wallet.address);
        return wallet;
      }

      console.log('⚠️ No burner wallet found in storage');
      return null;
    } catch (error) {
      console.error('❌ Error loading burner wallet:', error);
      return null;
    }
  }

  /**
   * Get the current wallet instance
   */
  getWallet(): ethers.Wallet | null {
    return this.wallet;
  }

  /**
   * Get or create wallet
   */
  async getOrCreateWallet(password?: string): Promise<ethers.Wallet> {
    if (this.wallet) {
      return this.wallet;
    }

    const existingWallet = await this.loadWallet(password);
    if (existingWallet) {
      return existingWallet;
    }

    return await this.createWallet(password);
  }

  /**
   * Delete burner wallet from storage
   */
  async deleteWallet(): Promise<void> {
    console.log('🔥 Deleting burner wallet...');

    try {
      await AsyncStorage.multiRemove([BURNER_WALLET_KEY, BURNER_WALLET_ENCRYPTED_KEY]);
      this.wallet = null;
      console.log('✅ Burner wallet deleted');
    } catch (error) {
      console.error('❌ Error deleting burner wallet:', error);
      throw error;
    }
  }

  /**
   * Export private key (for backup)
   */
  async exportPrivateKey(): Promise<string | null> {
    if (!this.wallet) {
      console.error('❌ No wallet to export');
      return null;
    }

    console.log('📤 Exporting private key');
    return this.wallet.privateKey;
  }

  /**
   * Export mnemonic (if available)
   */
  async exportMnemonic(): Promise<string | null> {
    if (!this.wallet || !this.wallet.mnemonic) {
      console.error('❌ No mnemonic available');
      return null;
    }

    console.log('📤 Exporting mnemonic');
    return this.wallet.mnemonic.phrase;
  }

  /**
   * Import wallet from private key
   */
  async importFromPrivateKey(privateKey: string, password?: string): Promise<ethers.Wallet> {
    console.log('📥 Importing wallet from private key');

    const wallet = new ethers.Wallet(privateKey);

    // Store the wallet
    if (password) {
      const encrypted = await wallet.encrypt(password);
      await AsyncStorage.setItem(BURNER_WALLET_ENCRYPTED_KEY, encrypted);
      console.log('🔒 Imported wallet encrypted and stored');
    } else {
      await AsyncStorage.setItem(BURNER_WALLET_KEY, wallet.privateKey);
      console.log('🔓 Imported wallet stored (unencrypted)');
    }

    this.wallet = wallet;

    console.log('✅ Wallet imported');
    console.log('📍 Address:', wallet.address);

    return wallet;
  }

  /**
   * Import wallet from mnemonic
   */
  async importFromMnemonic(mnemonic: string, password?: string): Promise<ethers.Wallet> {
    console.log('📥 Importing wallet from mnemonic');

    const wallet = ethers.Wallet.fromMnemonic(mnemonic);

    // Store the wallet
    if (password) {
      const encrypted = await wallet.encrypt(password);
      await AsyncStorage.setItem(BURNER_WALLET_ENCRYPTED_KEY, encrypted);
      console.log('🔒 Imported wallet encrypted and stored');
    } else {
      await AsyncStorage.setItem(BURNER_WALLET_KEY, wallet.privateKey);
      console.log('🔓 Imported wallet stored (unencrypted)');
    }

    this.wallet = wallet;

    console.log('✅ Wallet imported from mnemonic');
    console.log('📍 Address:', wallet.address);

    return wallet;
  }

  /**
   * Get wallet address
   */
  getAddress(): string | null {
    return this.wallet?.address || null;
  }

  /**
   * Get wallet balance on a specific network
   */
  async getBalance(provider: ethers.providers.Provider): Promise<ethers.BigNumber> {
    if (!this.wallet) {
      throw new Error('No wallet loaded');
    }

    const balance = await provider.getBalance(this.wallet.address);
    return balance;
  }

  /**
   * Connect wallet to a provider
   */
  connectToProvider(provider: ethers.providers.Provider): ethers.Wallet | null {
    if (!this.wallet) {
      console.error('❌ No wallet to connect');
      return null;
    }

    return this.wallet.connect(provider);
  }
}

// Export singleton instance
export const burnerWalletService = new BurnerWalletService();

// Export convenience functions
export const hasWallet = () => burnerWalletService.hasWallet();
export const createWallet = (password?: string) => burnerWalletService.createWallet(password);
export const loadWallet = (password?: string) => burnerWalletService.loadWallet(password);
export const getWallet = () => burnerWalletService.getWallet();
export const getOrCreateWallet = (password?: string) => burnerWalletService.getOrCreateWallet(password);
export const deleteWallet = () => burnerWalletService.deleteWallet();
export const exportPrivateKey = () => burnerWalletService.exportPrivateKey();
export const exportMnemonic = () => burnerWalletService.exportMnemonic();
export const importFromPrivateKey = (privateKey: string, password?: string) =>
  burnerWalletService.importFromPrivateKey(privateKey, password);
export const importFromMnemonic = (mnemonic: string, password?: string) =>
  burnerWalletService.importFromMnemonic(mnemonic, password);
export const getAddress = () => burnerWalletService.getAddress();
export const getBalance = (provider: ethers.providers.Provider) =>
  burnerWalletService.getBalance(provider);
export const connectToProvider = (provider: ethers.providers.Provider) =>
  burnerWalletService.connectToProvider(provider);
