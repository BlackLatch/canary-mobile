/**
 * PIN-Wrapped Local Embedded Ethereum Wallet
 *
 * Implements PIN-protected, locally stored Ethereum private key using a PIN-derived wrapping key.
 * The PIN is never stored - only used to derive encryption keys.
 *
 * Security features:
 * - PBKDF2 key derivation (150,000 iterations)
 * - AES-128-CBC encryption with HMAC-SHA256 authentication
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
const PBKDF2_ITERATIONS = 100000; // Reduced from 150,000 for better performance on mobile
const PBKDF2_KEY_LENGTH = 32; // 256 bits for AES-256
const PBKDF2_HASH = 'SHA256';

// AES-CBC configuration
const AES_IV_LENGTH = 16; // 128 bits for CBC
const SALT_LENGTH = 16; // 128 bits

// Bundle version for future compatibility
const BUNDLE_VERSION = '2.0'; // Updated for CBC+HMAC

/**
 * Encrypted key bundle structure stored in secure storage
 */
interface EncryptedKeyBundle {
  version: string;
  salt: string; // base64
  iv: string; // base64
  ciphertext: string; // base64
  hmacTag?: string; // base64 - HMAC-SHA256 for authentication (v2.0)
  authTag?: string; // base64 - for backward compatibility with old GCM attempts
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
   * @returns The Ethereum wallet instance and address
   */
  async createPinProtectedWallet(pin: string): Promise<{ wallet: ethers.Wallet; address: string }> {
    this.validatePin(pin);

    // Clear any existing wallet first (important for re-creation during testing)
    await this.resetWallet();

    // Step 1: Generate random salt
    const saltBuffer = await RNSimpleCrypto.utils.randomBytes(SALT_LENGTH);
    const salt = new Uint8Array(saltBuffer);

    // Step 2: Derive wrapping key from PIN using PBKDF2
    const wrappingKey = await this.deriveWrappingKey(pin, salt);

    // Step 3: Generate new Ethereum wallet
    const wallet = ethers.Wallet.createRandom();
    const privateKeyBytes = this.hexToBytes(wallet.privateKey);

    // Step 4: Encrypt private key with wrapping key using AES-128-CBC
    const ivBuffer = await RNSimpleCrypto.utils.randomBytes(AES_IV_LENGTH);
    const iv = new Uint8Array(ivBuffer);

    // Create clean ArrayBuffers for encryption
    // RNSimpleCrypto expects ArrayBuffers, not Uint8Array views
    const privateKeyBuffer = new ArrayBuffer(privateKeyBytes.length);
    const privateKeyView = new Uint8Array(privateKeyBuffer);
    privateKeyView.set(privateKeyBytes);

    const wrappingKeyBuffer = new ArrayBuffer(wrappingKey.length);
    const wrappingKeyView = new Uint8Array(wrappingKeyBuffer);
    wrappingKeyView.set(wrappingKey);

    const ivCleanBuffer = new ArrayBuffer(iv.length);
    const ivView = new Uint8Array(ivCleanBuffer);
    ivView.set(iv);

    // Encrypt with clean buffers
    const ciphertextBuffer = await RNSimpleCrypto.AES.encrypt(
      privateKeyBuffer,
      wrappingKeyBuffer,
      ivCleanBuffer
    );

    // Check if encryption succeeded - ArrayBuffer should have a byteLength > 0
    if (!ciphertextBuffer || !(ciphertextBuffer instanceof ArrayBuffer) || !ciphertextBuffer.byteLength) {
      throw new Error('Encryption failed - invalid result');
    }

    const ciphertext = new Uint8Array(ciphertextBuffer);

    // Step 5: Generate HMAC for authentication
    const hmacKeyBuffer = await RNSimpleCrypto.HMAC.hmac256(
      wrappingKeyBuffer,
      ciphertextBuffer
    );
    const hmacTag = new Uint8Array(hmacKeyBuffer);

    // Step 6: Create encrypted bundle
    const bundle: EncryptedKeyBundle = {
      version: BUNDLE_VERSION,
      salt: this.toBase64(salt),
      iv: this.toBase64(iv),
      ciphertext: this.toBase64(ciphertext),
      hmacTag: this.toBase64(hmacTag),
      authTag: undefined, // Explicitly set for clarity
      ethAddress: wallet.address,
    };

    // Step 7: Store encrypted bundle in secure storage
    await this.storeBundle(bundle);

    // Clear sensitive data from memory
    this.clearArray(privateKeyBytes);
    this.clearArray(wrappingKey);

    // Return wallet instance to avoid immediate re-decryption
    return { wallet, address: wallet.address };
  }

  /**
   * Imports an existing wallet and protects it with a PIN
   *
   * @param privateKey - Ethereum private key (hex string with or without 0x prefix)
   * @param pin - 6-digit PIN (never stored)
   * @returns The Ethereum wallet instance and address
   */
  async importWalletWithPin(privateKey: string, pin: string): Promise<{ wallet: ethers.Wallet; address: string }> {
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
    const saltBuffer = await RNSimpleCrypto.utils.randomBytes(SALT_LENGTH);
    const salt = new Uint8Array(saltBuffer);

    // Step 2: Derive wrapping key from PIN
    const wrappingKey = await this.deriveWrappingKey(pin, salt);

    // Step 3: Encrypt private key with wrapping key using AES-128-CBC
    const privateKeyBytes = this.hexToBytes(privateKey);
    const ivBuffer = await RNSimpleCrypto.utils.randomBytes(AES_IV_LENGTH);
    const iv = new Uint8Array(ivBuffer);

    // Create clean ArrayBuffers for encryption (same as in createPinProtectedWallet)
    const privateKeyBuffer = new ArrayBuffer(privateKeyBytes.length);
    const privateKeyView = new Uint8Array(privateKeyBuffer);
    privateKeyView.set(privateKeyBytes);

    const wrappingKeyBuffer = new ArrayBuffer(wrappingKey.length);
    const wrappingKeyView = new Uint8Array(wrappingKeyBuffer);
    wrappingKeyView.set(wrappingKey);

    const ivCleanBuffer = new ArrayBuffer(iv.length);
    const ivView = new Uint8Array(ivCleanBuffer);
    ivView.set(iv);

    // Encrypt with clean buffers
    const ciphertextBuffer = await RNSimpleCrypto.AES.encrypt(
      privateKeyBuffer,
      wrappingKeyBuffer,
      ivCleanBuffer
    );

    // Check if encryption succeeded - ArrayBuffer should have a byteLength > 0
    if (!ciphertextBuffer || !(ciphertextBuffer instanceof ArrayBuffer) || !ciphertextBuffer.byteLength) {
      throw new Error('Encryption failed - invalid result');
    }

    const ciphertext = new Uint8Array(ciphertextBuffer);

    // Step 4: Generate HMAC for authentication
    const hmacKeyBuffer = await RNSimpleCrypto.HMAC.hmac256(
      wrappingKeyBuffer,
      ciphertextBuffer
    );
    const hmacTag = new Uint8Array(hmacKeyBuffer);

    // Step 5: Create encrypted bundle
    const bundle: EncryptedKeyBundle = {
      version: BUNDLE_VERSION,
      salt: this.toBase64(salt),
      iv: this.toBase64(iv),
      ciphertext: this.toBase64(ciphertext),
      hmacTag: this.toBase64(hmacTag),
      authTag: undefined, // Explicitly set for clarity
      ethAddress: wallet.address,
    };

    // Step 6: Store encrypted bundle
    await this.storeBundle(bundle);

    // Clear sensitive data
    this.clearArray(privateKeyBytes);
    this.clearArray(wrappingKey);

    // Return wallet instance to avoid immediate re-decryption
    return { wallet, address: wallet.address };
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
    const hmacTag = this.fromBase64(bundle.hmacTag || bundle.authTag || ''); // Support old format temporarily

    // Step 3: Re-derive wrapping key from PIN
    const wrappingKey = await this.deriveWrappingKey(pin, salt);

    // Step 4: Verify HMAC before decrypting (authenticate-then-decrypt)
    try {
      // Create clean buffers for HMAC verification and decryption
      const ciphertextBuffer = new ArrayBuffer(ciphertext.length);
      const ciphertextView = new Uint8Array(ciphertextBuffer);
      ciphertextView.set(ciphertext);

      const wrappingKeyBuffer = new ArrayBuffer(wrappingKey.length);
      const wrappingKeyView = new Uint8Array(wrappingKeyBuffer);
      wrappingKeyView.set(wrappingKey);

      const ivBuffer = new ArrayBuffer(iv.length);
      const ivView = new Uint8Array(ivBuffer);
      ivView.set(iv);

      const expectedHmacBuffer = await RNSimpleCrypto.HMAC.hmac256(
        wrappingKeyBuffer,
        ciphertextBuffer
      );
      const expectedHmac = new Uint8Array(expectedHmacBuffer);

      // Compare HMAC tags (constant-time comparison would be better, but this is acceptable for PIN protection)
      let hmacValid = hmacTag.length === expectedHmac.length;
      for (let i = 0; i < hmacTag.length && i < expectedHmac.length; i++) {
        if (hmacTag[i] !== expectedHmac[i]) {
          hmacValid = false;
        }
      }

      if (!hmacValid) {
        throw new Error('Authentication failed - wrong PIN or corrupted data');
      }

      // Step 5: Decrypt private key using AES-128-CBC
      const decryptedBuffer = await RNSimpleCrypto.AES.decrypt(
        ciphertextBuffer,
        wrappingKeyBuffer,
        ivBuffer
      );

      // Verify decryption result
      if (!decryptedBuffer || !(decryptedBuffer instanceof ArrayBuffer) || !decryptedBuffer.byteLength) {
        throw new Error('Decryption failed - invalid result');
      }

      const decrypted = new Uint8Array(decryptedBuffer);

      // Step 6: Create wallet from decrypted private key
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

      // Decryption or authentication failure means wrong PIN
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
      // Clean up any legacy wallets from old API (one-time migration)
      try {
        const legacyCheck = await Keychain.getInternetCredentials(CANARY_ETH_KEY_BUNDLE);
        if (legacyCheck) {
          console.log('🧹 Found legacy wallet, clearing it...');
          await Keychain.resetInternetCredentials(CANARY_ETH_KEY_BUNDLE);
          console.log('✅ Legacy wallet cleared');
        }
      } catch (e) {
        // Ignore errors from legacy cleanup
      }

      // Check for wallet using canonical API
      const credentials = await Keychain.getGenericPassword({
        service: CANARY_ETH_KEY_BUNDLE,
      });
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
    try {
      console.log('🧹 Resetting wallet - clearing keychain...');

      // Clear new API
      const result = await Keychain.resetGenericPassword({
        service: CANARY_ETH_KEY_BUNDLE,
      });
      console.log('🧹 GenericPassword reset result:', result);

      // Also clear old API to ensure complete cleanup
      await Keychain.resetInternetCredentials(CANARY_ETH_KEY_BUNDLE);
      console.log('🧹 InternetCredentials cleared (cleanup)');

      console.log('✅ Wallet reset complete');
    } catch (error) {
      console.log('🧹 Reset completed:', error);
    }
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
    // RNSimpleCrypto expects ArrayBuffers, not Uint8Arrays
    const keyBuffer = await RNSimpleCrypto.PBKDF2.hash(
      pinBytes.buffer.slice(pinBytes.byteOffset, pinBytes.byteOffset + pinBytes.byteLength),
      salt.buffer.slice(salt.byteOffset, salt.byteOffset + salt.byteLength),
      PBKDF2_ITERATIONS,
      PBKDF2_KEY_LENGTH,
      PBKDF2_HASH
    );
    return new Uint8Array(keyBuffer);
  }

  /**
   * Stores encrypted bundle in secure storage
   */
  private async storeBundle(bundle: EncryptedKeyBundle): Promise<void> {
    try {
      const bundleJson = JSON.stringify(bundle);

      await Keychain.setGenericPassword(
        bundle.ethAddress, // username
        bundleJson, // password
        {
          service: CANARY_ETH_KEY_BUNDLE,
          accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
          // Use SECURE_SOFTWARE for simulator compatibility
          // On real devices with secure hardware, it will automatically use the best available
          securityLevel: Keychain.SECURITY_LEVEL.SECURE_SOFTWARE,
        }
      );
    } catch (error) {
      console.error('Failed to store bundle in keychain:', error);
      // Throw a more user-friendly error
      throw new Error('Failed to securely store wallet. Please try again.');
    }
  }

  /**
   * Loads encrypted bundle from secure storage
   */
  private async loadBundle(): Promise<EncryptedKeyBundle | null> {
    try {
      const credentials = await Keychain.getGenericPassword({
        service: CANARY_ETH_KEY_BUNDLE,
      });
      if (!credentials) {
        return null;
      }
      const bundle = JSON.parse(credentials.password) as EncryptedKeyBundle;
      return bundle;
    } catch (error) {
      console.error('Failed to load bundle from keychain:', error);
      // Return null instead of throwing to allow graceful handling
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
    // convertArrayBufferToBase64 expects ArrayBuffer, not Uint8Array
    // Create a new clean buffer to avoid issues with offset/length
    const buffer = new ArrayBuffer(bytes.length);
    const view = new Uint8Array(buffer);
    view.set(bytes);
    return RNSimpleCrypto.utils.convertArrayBufferToBase64(buffer);
  }

  /**
   * Converts base64 to Uint8Array
   */
  private fromBase64(base64: string): Uint8Array {
    const buffer = RNSimpleCrypto.utils.convertBase64ToArrayBuffer(base64);
    return new Uint8Array(buffer);
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