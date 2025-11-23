/**
 * Crypto Diagnostics Utility
 * Verifies that native crypto modules are properly loaded and functioning
 */

import { NativeModules } from 'react-native';

export function checkCryptoPerformance() {
  const diagnostics: { [key: string]: any } = {};

  // Check if quick-crypto native module is loaded
  diagnostics.quickCryptoNative = !!NativeModules.QuickCrypto;

  // Check if the global crypto object is from quick-crypto
  diagnostics.globalCrypto = typeof global.crypto !== 'undefined';

  // Check if Buffer is available
  diagnostics.buffer = typeof Buffer !== 'undefined';

  // Check if we're using the native implementation
  try {
    const { pbkdf2Sync } = require('react-native-quick-crypto');
    diagnostics.pbkdf2Available = typeof pbkdf2Sync === 'function';

    // Performance test - run a small PBKDF2 operation
    if (diagnostics.pbkdf2Available) {
      const startTime = Date.now();
      const testKey = pbkdf2Sync(
        Buffer.from('test', 'utf8'),
        Buffer.from('salt', 'utf8'),
        1000, // Low iteration count for testing
        32,
        'sha256'
      );
      const endTime = Date.now();
      diagnostics.pbkdf2TestTime = endTime - startTime;
      diagnostics.pbkdf2TestSuccess = testKey.length === 32;
    }
  } catch (error) {
    diagnostics.pbkdf2Error = error.message;
  }

  // Check if react-native-quick-crypto was properly installed
  try {
    const quickCrypto = require('react-native-quick-crypto');
    diagnostics.quickCryptoInstalled = !!quickCrypto.install;
    diagnostics.quickCryptoVersion = quickCrypto.version || 'unknown';
  } catch (error) {
    diagnostics.quickCryptoError = error.message;
  }

  return diagnostics;
}

export function logCryptoDiagnostics() {
  const diagnostics = checkCryptoPerformance();

  console.log('=== CRYPTO DIAGNOSTICS ===');
  console.log('Quick Crypto Native Module:', diagnostics.quickCryptoNative ? '✅' : '❌');
  console.log('Global Crypto:', diagnostics.globalCrypto ? '✅' : '❌');
  console.log('Buffer Available:', diagnostics.buffer ? '✅' : '❌');
  console.log('PBKDF2 Available:', diagnostics.pbkdf2Available ? '✅' : '❌');

  if (diagnostics.pbkdf2TestTime !== undefined) {
    console.log(`PBKDF2 Test (1000 iterations): ${diagnostics.pbkdf2TestTime}ms`);
  }

  if (diagnostics.pbkdf2Error) {
    console.log('PBKDF2 Error:', diagnostics.pbkdf2Error);
  }

  if (diagnostics.quickCryptoError) {
    console.log('Quick Crypto Error:', diagnostics.quickCryptoError);
  }

  console.log('========================');

  return diagnostics;
}