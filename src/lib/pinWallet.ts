/**
 * PIN-Wrapped Local Embedded Ethereum Wallet
 *
 * Implements PIN-protected, locally stored Ethereum private key using a PIN-derived wrapping key.
 * The PIN is never stored - only used to derive encryption keys.
 *
 * Security features:
 * - PBKDF2 key derivation (150,000-300,000 iterations)
 * - AES-256-GCM authenticated encryption
 * - Secure storage via react-native-keychain
 * - No plaintext keys ever written to disk
 */

import * as Keychain from 'react-native-keychain';
import RNSimpleCrypto from 'react-native-simple-crypto';
import { ethers } from 'ethers';
import 'react-native-get-random-values';

// Storage key for encrypted wallet bundle
const CANARY_ETH_KEY_BUNDLE = 'canary_eth_key_bundle';

// PBKDF2 configuration (tuned for mobile performance)
const PBKDF2_ITERATIONS = 150000; // Adjust between 150,000-300,000 based on performance
const PBKDF2_KEY_LENGTH = 32; // 256 bits for AES-256
const PBKDF2_HASH = 'SHA256';

// AES-GCM configuration
const AES_IV_LENGTH = 12; // 96 bits for GCM
const SALT_LENGTH = 16; // 128 bits

// Bundle version for future compatibility
const BUNDLE_VERSION = '1.0';

/**
 * Encrypted key bundle structure stored in secure storage
 */
interface EncryptedKeyBundle {
  version: string;
  salt: string; // base64
  iv: string; // base64
  ciphertext: string; // base64
  authTag: string; // base64
  ethAddress: string;
}

/**
 * PIN Wallet Service - Manages PIN-protected Ethereum wallets
 */
export class PinWalletService {
  /**
   * Creates a new PIN-protected Ethereum wallet
   *
   * @param pin - 6-digit PIN (never stored)
   * @returns The Ethereum address of the created wallet
   */
  async createPinProtectedWallet(pin: string): Promise<string> {
    this.validatePin(pin);

    // Step 1: Generate random salt
    const salt = await RNSimpleCrypto.utils.randomBytes(SALT_LENGTH);

    // Step 2: Derive wrapping key from PIN using PBKDF2
    const wrappingKey = await this.deriveWrappingKey(pin, salt);

    // Step 3: Generate new Ethereum wallet
    const wallet = ethers.Wallet.createRandom();
    const privateKeyBytes = this.hexToBytes(wallet.privateKey);

    // Step 4: Encrypt private key with wrapping key using AES-256-GCM
    const iv = await RNSimpleCrypto.utils.randomBytes(AES_IV_LENGTH);
    const encrypted = await RNSimpleCrypto.AES.encrypt(
      privateKeyBytes,
      wrappingKey,
      iv,
      'GCM'
    );

    // Step 5: Create encrypted bundle
    const bundle: EncryptedKeyBundle = {
      version: BUNDLE_VERSION,
      salt: this.toBase64(salt),
      iv: this.toBase64(iv),
      ciphertext: this.toBase64(encrypted.ciphertext),
      authTag: this.toBase64(encrypted.tag),
      ethAddress: wallet.address,
    };

    // Step 6: Store encrypted bundle in secure storage
    await this.storeBundle(bundle);

    // Clear sensitive data from memory
    this.clearArray(privateKeyBytes);
    this.clearArray(wrappingKey);

    return wallet.address;
  }

  /**
   * Imports an existing wallet and protects it with a PIN
   *
   * @param privateKey - Ethereum private key (hex string with or without 0x prefix)
   * @param pin - 6-digit PIN (never stored)
   * @returns The Ethereum address of the imported wallet
   */
  async importWalletWithPin(privateKey: string, pin: string): Promise<string> {
    this.validatePin(pin);

    // Ensure private key has 0x prefix
    if (!privateKey.startsWith('0x')) {
      privateKey = '0x' + privateKey;
    }

    // Validate private key
    let wallet: ethers.Wallet;
    try {
      wallet = new ethers.Wallet(privateKey);
    } catch (error) {
      throw new Error('Invalid private key');
    }

    // Step 1: Generate random salt
    const salt = await RNSimpleCrypto.utils.randomBytes(SALT_LENGTH);

    // Step 2: Derive wrapping key from PIN
    const wrappingKey = await this.deriveWrappingKey(pin, salt);

    // Step 3: Encrypt private key with wrapping key
    const privateKeyBytes = this.hexToBytes(privateKey);
    const iv = await RNSimpleCrypto.utils.randomBytes(AES_IV_LENGTH);
    const encrypted = await RNSimpleCrypto.AES.encrypt(
      privateKeyBytes,
      wrappingKey,
      iv,
      'GCM'
    );

    // Step 4: Create encrypted bundle
    const bundle: EncryptedKeyBundle = {
      version: BUNDLE_VERSION,
      salt: this.toBase64(salt),
      iv: this.toBase64(iv),
      ciphertext: this.toBase64(encrypted.ciphertext),
      authTag: this.toBase64(encrypted.tag),
      ethAddress: wallet.address,
    };

    // Step 5: Store encrypted bundle
    await this.storeBundle(bundle);

    // Clear sensitive data
    this.clearArray(privateKeyBytes);
    this.clearArray(wrappingKey);

    return wallet.address;
  }

  /**
   * Unlocks wallet with PIN to get the Ethereum wallet instance
   *
   * @param pin - 6-digit PIN
   * @returns Ethereum wallet instance if PIN is correct
   * @throws Error if PIN is incorrect or no wallet exists
   */
  async unlockWithPin(pin: string): Promise<ethers.Wallet> {
    this.validatePin(pin);

    // Step 1: Load encrypted bundle from secure storage
    const bundle = await this.loadBundle();
    if (!bundle) {
      throw new Error('No wallet found');
    }

    // Step 2: Parse bundle fields
    const salt = this.fromBase64(bundle.salt);
    const iv = this.fromBase64(bundle.iv);
    const ciphertext = this.fromBase64(bundle.ciphertext);
    const authTag = this.fromBase64(bundle.authTag);

    // Step 3: Re-derive wrapping key from PIN
    const wrappingKey = await this.deriveWrappingKey(pin, salt);

    // Step 4: Decrypt private key using AES-256-GCM
    try {
      const decrypted = await RNSimpleCrypto.AES.decrypt(
        { ciphertext, tag: authTag },
        wrappingKey,
        iv,
        'GCM'
      );

      // Step 5: Create wallet from decrypted private key
      const privateKey = this.bytesToHex(decrypted);
      const wallet = new ethers.Wallet(privateKey);

      // Verify address matches stored address (extra safety check)
      if (wallet.address.toLowerCase() !== bundle.ethAddress.toLowerCase()) {
        throw new Error('Address mismatch - data corruption detected');
      }

      // Clear sensitive data
      this.clearArray(wrappingKey);
      this.clearArray(decrypted);

      return wallet;
    } catch (error) {
      // Clear sensitive data
      this.clearArray(wrappingKey);

      // Decryption failure means wrong PIN
      throw new Error('Incorrect PIN');
    }
  }

  /**
   * Checks if a PIN-protected wallet exists
   *
   * @returns True if wallet exists, false otherwise
   */
  async hasWallet(): Promise<boolean> {
    try {
      const credentials = await Keychain.getInternetCredentials(CANARY_ETH_KEY_BUNDLE);
      return !!credentials;
    } catch {
      return false;
    }
  }

  /**
   * Gets the wallet address without requiring PIN
   * Useful for displaying the address in UI
   *
   * @returns Ethereum address or null if no wallet
   */
  async getWalletAddress(): Promise<string | null> {
    const bundle = await this.loadBundle();
    return bundle?.ethAddress || null;
  }

  /**
   * Deletes the PIN-protected wallet (reset vault)
   * WARNING: This permanently deletes the wallet - cannot be recovered without PIN
   */
  async resetWallet(): Promise<void> {
    await Keychain.resetInternetCredentials(CANARY_ETH_KEY_BUNDLE);
  }

  /**
   * Changes the PIN for an existing wallet
   *
   * @param currentPin - Current PIN for verification
   * @param newPin - New PIN to set
   */
  async changePin(currentPin: string, newPin: string): Promise<void> {
    this.validatePin(newPin);

    // First unlock with current PIN to get private key
    const wallet = await this.unlockWithPin(currentPin);

    // Re-encrypt with new PIN
    await this.importWalletWithPin(wallet.privateKey, newPin);
  }

  // ===== Private Helper Methods =====

  /**
   * Validates PIN format (6 digits)
   */
  private validatePin(pin: string): void {
    if (!/^\d{6}$/.test(pin)) {
      throw new Error('PIN must be exactly 6 digits');
    }
  }

  /**
   * Derives wrapping key from PIN using PBKDF2
   */
  private async deriveWrappingKey(pin: string, salt: Uint8Array): Promise<Uint8Array> {
    const pinBytes = new TextEncoder().encode(pin);
    const key = await RNSimpleCrypto.PBKDF2.hash(
      pinBytes,
      salt,
      PBKDF2_ITERATIONS,
      PBKDF2_KEY_LENGTH,
      PBKDF2_HASH
    );
    return key;
  }

  /**
   * Stores encrypted bundle in secure storage
   */
  private async storeBundle(bundle: EncryptedKeyBundle): Promise<void> {
    const bundleJson = JSON.stringify(bundle);

    await Keychain.setInternetCredentials(
      CANARY_ETH_KEY_BUNDLE,
      bundle.ethAddress,
      bundleJson,
      {
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        securityLevel: Keychain.SECURITY_LEVEL.SECURE_HARDWARE,
      }
    );
  }

  /**
   * Loads encrypted bundle from secure storage
   */
  private async loadBundle(): Promise<EncryptedKeyBundle | null> {
    try {
      const credentials = await Keychain.getInternetCredentials(CANARY_ETH_KEY_BUNDLE);
      if (!credentials) {
        return null;
      }
      return JSON.parse(credentials.password) as EncryptedKeyBundle;
    } catch {
      return null;
    }
  }

  /**
   * Converts hex string to Uint8Array
   */
  private hexToBytes(hex: string): Uint8Array {
    if (hex.startsWith('0x')) {
      hex = hex.slice(2);
    }
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes;
  }

  /**
   * Converts Uint8Array to hex string
   */
  private bytesToHex(bytes: Uint8Array): string {
    return '0x' + Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Converts Uint8Array to base64
   */
  private toBase64(bytes: Uint8Array): string {
    return RNSimpleCrypto.utils.convertArrayBufferToBase64(bytes);
  }

  /**
   * Converts base64 to Uint8Array
   */
  private fromBase64(base64: string): Uint8Array {
    return RNSimpleCrypto.utils.convertBase64ToArrayBuffer(base64);
  }

  /**
   * Clears sensitive data from memory
   */
  private clearArray(array: Uint8Array): void {
    if (array && array.length > 0) {
      array.fill(0);
    }
  }
}

// Export singleton instance
export const pinWalletService = new PinWalletService();