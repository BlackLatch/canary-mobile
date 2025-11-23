/**
 * PIN-Wrapped Local Embedded Ethereum Wallet
 *
 * Implements PIN-protected, locally stored Ethereum private key using a PIN-derived wrapping key.
 * The PIN is never stored - only used to derive encryption keys.
 *
 * Security features:
 * - PBKDF2 key derivation (310,000 iterations - 2025 OWASP standard)
 * - AES-256-CBC encryption with HMAC-SHA256 authentication
 * - Secure storage via react-native-keychain
 * - No plaintext keys ever written to disk
 * - Native crypto operations via react-native-quick-crypto (10-50x faster)
 */

import * as Keychain from 'react-native-keychain';
import { pbkdf2Sync, randomBytes, createCipheriv, createDecipheriv, createHmac } from 'react-native-quick-crypto';
import { ethers } from 'ethers';
import 'react-native-get-random-values';

// Storage key for encrypted wallet bundle
const CANARY_ETH_KEY_BUNDLE = 'canary_eth_key_bundle';

// PBKDF2 configuration (2025 OWASP standard for mobile)
const PBKDF2_ITERATIONS = 310000; // Increased from 100,000 for better security
const PBKDF2_KEY_LENGTH = 32; // 256 bits for AES-256
const PBKDF2_HASH = 'sha256';

// AES-CBC configuration
const AES_IV_LENGTH = 16; // 128 bits for CBC
const SALT_LENGTH = 16; // 128 bits

// Bundle version for future compatibility
const BUNDLE_VERSION = '3.0'; // Updated for quick-crypto

/**
 * Encrypted key bundle structure stored in secure storage
 */
interface EncryptedKeyBundle {
  version: string;
  salt: string; // base64
  iv: string; // base64
  ciphertext: string; // base64
  hmacTag?: string; // base64 - HMAC-SHA256 for authentication
  authTag?: string; // base64 - for backward compatibility
  ethAddress: string;
}

/**
 * PIN Wallet Service - Manages PIN-protected Ethereum wallets
 */
export class PinWalletService {
  /**
   * Helper to defer crypto operations until UI settles
   */
  private async waitForUI(): Promise<void> {
    return new Promise(resolve => {
      // Use requestIdleCallback for better performance and to avoid deprecation warning
      if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(() => resolve(), { timeout: 100 });
      } else {
        // Fallback to setTimeout if requestIdleCallback is not available
        setTimeout(() => resolve(), 0);
      }
    });
  }

  /**
   * Creates a new PIN-protected Ethereum wallet
   *
   * @param pin - 6-digit PIN (never stored)
   * @returns The Ethereum wallet instance and address
   */
  async createPinProtectedWallet(pin: string): Promise<{ wallet: ethers.Wallet; address: string }> {
    this.validatePin(pin);

    // Wait for UI to settle to prevent freezing during navigation
    await this.waitForUI();

    // Clear any existing wallet first
    await this.resetWallet();

    // Step 1: Generate random salt (native)
    const salt = randomBytes(SALT_LENGTH);

    // Step 2: Derive wrapping key from PIN using PBKDF2 (native via JSI - FAST!)
    const wrappingKey = pbkdf2Sync(
      Buffer.from(pin, 'utf8'),
      salt,
      PBKDF2_ITERATIONS,
      PBKDF2_KEY_LENGTH,
      PBKDF2_HASH
    );

    // Step 3: Generate new Ethereum wallet
    const wallet = ethers.Wallet.createRandom();
    const privateKeyBytes = Buffer.from(wallet.privateKey.slice(2), 'hex'); // Remove '0x' prefix

    // Step 4: Generate IV for AES
    const iv = randomBytes(AES_IV_LENGTH);

    // Step 5: Encrypt private key with AES-256-CBC (native)
    const cipher = createCipheriv('aes-256-cbc', wrappingKey, iv);
    const encrypted = Buffer.concat([
      cipher.update(privateKeyBytes),
      cipher.final()
    ]);

    // Step 6: Generate HMAC for authentication
    const hmac = createHmac('sha256', wrappingKey);
    hmac.update(encrypted);
    const hmacTag = hmac.digest();

    // Step 7: Create encrypted bundle
    const bundle: EncryptedKeyBundle = {
      version: BUNDLE_VERSION,
      salt: salt.toString('base64'),
      iv: iv.toString('base64'),
      ciphertext: encrypted.toString('base64'),
      hmacTag: hmacTag.toString('base64'),
      authTag: undefined,
      ethAddress: wallet.address,
    };

    // Step 8: Store encrypted bundle in secure storage
    await this.storeBundle(bundle);

    // Clear sensitive data from memory
    privateKeyBytes.fill(0);
    wrappingKey.fill(0);

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

    // Wait for UI to settle
    await this.waitForUI();

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
    const salt = randomBytes(SALT_LENGTH);

    // Step 2: Derive wrapping key from PIN (native PBKDF2)
    const wrappingKey = pbkdf2Sync(
      Buffer.from(pin, 'utf8'),
      salt,
      PBKDF2_ITERATIONS,
      PBKDF2_KEY_LENGTH,
      PBKDF2_HASH
    );

    // Step 3: Prepare private key bytes
    const privateKeyBytes = Buffer.from(privateKey.slice(2), 'hex');

    // Step 4: Generate IV and encrypt
    const iv = randomBytes(AES_IV_LENGTH);
    const cipher = createCipheriv('aes-256-cbc', wrappingKey, iv);
    const encrypted = Buffer.concat([
      cipher.update(privateKeyBytes),
      cipher.final()
    ]);

    // Step 5: Generate HMAC
    const hmac = createHmac('sha256', wrappingKey);
    hmac.update(encrypted);
    const hmacTag = hmac.digest();

    // Step 6: Create encrypted bundle
    const bundle: EncryptedKeyBundle = {
      version: BUNDLE_VERSION,
      salt: salt.toString('base64'),
      iv: iv.toString('base64'),
      ciphertext: encrypted.toString('base64'),
      hmacTag: hmacTag.toString('base64'),
      authTag: undefined,
      ethAddress: wallet.address,
    };

    // Step 7: Store encrypted bundle
    await this.storeBundle(bundle);

    // Clear sensitive data
    privateKeyBytes.fill(0);
    wrappingKey.fill(0);

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

    // Wait for UI to settle
    await this.waitForUI();

    // Step 1: Load encrypted bundle from secure storage
    const bundle = await this.loadBundle();
    if (!bundle) {
      throw new Error('No wallet found');
    }

    // Step 2: Parse bundle fields
    const salt = Buffer.from(bundle.salt, 'base64');
    const iv = Buffer.from(bundle.iv, 'base64');
    const ciphertext = Buffer.from(bundle.ciphertext, 'base64');
    const storedHmac = Buffer.from(bundle.hmacTag || bundle.authTag || '', 'base64');

    // Step 3: Re-derive wrapping key from PIN (native PBKDF2)
    const wrappingKey = pbkdf2Sync(
      Buffer.from(pin, 'utf8'),
      salt,
      PBKDF2_ITERATIONS,
      PBKDF2_KEY_LENGTH,
      PBKDF2_HASH
    );

    try {
      // Step 4: Verify HMAC before decrypting (authenticate-then-decrypt)
      const hmac = createHmac('sha256', wrappingKey);
      hmac.update(ciphertext);
      const computedHmac = hmac.digest();

      // Constant-time comparison
      if (!this.constantTimeCompare(computedHmac, storedHmac)) {
        throw new Error('Authentication failed');
      }

      // Step 5: Decrypt private key using AES-256-CBC
      const decipher = createDecipheriv('aes-256-cbc', wrappingKey, iv);
      const decrypted = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final()
      ]);

      // Step 6: Create wallet from decrypted private key
      const privateKey = '0x' + decrypted.toString('hex');
      const wallet = new ethers.Wallet(privateKey);

      // Verify address matches stored address (extra safety check)
      if (wallet.address.toLowerCase() !== bundle.ethAddress.toLowerCase()) {
        throw new Error('Address mismatch - data corruption detected');
      }

      // Clear sensitive data
      wrappingKey.fill(0);
      decrypted.fill(0);

      return wallet;
    } catch (error) {
      // Clear sensitive data
      wrappingKey.fill(0);

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
      // Check for wallet using Generic Password API only
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
      // console.log('🧹 Resetting wallet - clearing keychain...');

      // Clear wallet using Generic Password API only
      const result = await Keychain.resetGenericPassword({
        service: CANARY_ETH_KEY_BUNDLE,
      });
      // console.log('🧹 GenericPassword reset result:', result);
      // console.log('✅ Wallet reset complete');
    } catch (error) {
      // console.log('🧹 Reset completed:', error);
      // Silently handle errors during reset
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
   * Constant-time comparison to prevent timing attacks
   */
  private constantTimeCompare(a: Buffer, b: Buffer): boolean {
    if (a.length !== b.length) return false;

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a[i] ^ b[i];
    }
    return result === 0;
  }

  /**
   * Stores encrypted bundle in secure storage
   */
  private async storeBundle(bundle: EncryptedKeyBundle): Promise<void> {
    const bundleJson = JSON.stringify(bundle);

    // Try hardware security first (Secure Enclave on iOS)
    try {
      await Keychain.setGenericPassword(
        bundle.ethAddress, // username
        bundleJson, // password
        {
          service: CANARY_ETH_KEY_BUNDLE,
          accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
          // Use hardware security module (Secure Enclave) on real devices
          securityLevel: Keychain.SECURITY_LEVEL.SECURE_HARDWARE,
        }
      );
      // console.log('✅ Wallet stored in hardware security module (Secure Enclave)');
      return;
    } catch (hwError) {
      // Hardware security not available (simulator or older devices)
      // console.log('⚠️ Hardware security not available, falling back to software encryption');
    }

    // Fallback to software encryption for simulators
    try {
      await Keychain.setGenericPassword(
        bundle.ethAddress, // username
        bundleJson, // password
        {
          service: CANARY_ETH_KEY_BUNDLE,
          accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
          // Fallback for simulators or devices without Secure Enclave
          securityLevel: Keychain.SECURITY_LEVEL.SECURE_SOFTWARE,
        }
      );
      // console.log('✅ Wallet stored with software encryption (simulator mode)');
    } catch (error) {
      // console.error('Failed to store bundle in keychain:', error);
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
      // console.error('Failed to load bundle from keychain:', error);
      // Return null instead of throwing to allow graceful handling
      return null;
    }
  }
}

// Export singleton instance
export const pinWalletService = new PinWalletService();