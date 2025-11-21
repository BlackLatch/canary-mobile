/**
 * PIN Entry Screen
 *
 * Screen for unlocking the wallet with PIN when the app is locked
 */

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Text,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PINInput } from '../components/PINInput';
import { useWallet } from '../contexts/WalletContext';
import { useTheme } from '../contexts/ThemeContext';
import { pinWalletService } from '../lib/pinWallet';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export const PINEntryScreen: React.FC = () => {
  const { theme } = useTheme();
  const { unlockWithPin, switchAccount, resetWallet } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [attempts, setAttempts] = useState(0);

  const MAX_ATTEMPTS = 5;
  const LOCKOUT_TIME = 30000; // 30 seconds
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);

  /**
   * Handle PIN submission
   */
  const handlePinSubmit = async (pin: string) => {
    // Check if locked out
    if (lockedUntil && Date.now() < lockedUntil) {
      const remainingSeconds = Math.ceil((lockedUntil - Date.now()) / 1000);
      setError(`Too many attempts. Try again in ${remainingSeconds} seconds`);
      return;
    }

    setLoading(true);
    setError(undefined);

    try {
      const success = await unlockWithPin(pin);

      if (success) {
        // Success - wallet is unlocked
        // Navigation will be handled by AuthenticatedApp
        setAttempts(0);
        setLockedUntil(null);
      } else {
        // Failed - wrong PIN
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);

        if (newAttempts >= MAX_ATTEMPTS) {
          // Lock out for 30 seconds
          const lockoutEnd = Date.now() + LOCKOUT_TIME;
          setLockedUntil(lockoutEnd);
          setError(`Too many attempts. Try again in 30 seconds`);

          // Reset attempts after lockout
          setTimeout(() => {
            setAttempts(0);
            setLockedUntil(null);
            setError(undefined);
          }, LOCKOUT_TIME);
        } else {
          const remaining = MAX_ATTEMPTS - newAttempts;
          setError(
            `Incorrect PIN. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining`
          );
        }
      }
    } catch (err) {
      console.error('PIN unlock error:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle forgot PIN
   */
  const handleForgotPin = () => {
    console.log('Forgot PIN button pressed');
    Alert.alert(
      'Reset Wallet?',
      'If you forgot your PIN, you must reset your wallet. This will delete your current wallet and you will need to create a new one or import an existing one.\n\nThis action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Reset Wallet',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('Resetting wallet...');
              await resetWallet();
              console.log('Wallet reset successful');
              // Navigation will be handled by the context automatically
            } catch (error) {
              console.error('Reset wallet error:', error);
              Alert.alert('Error', 'Failed to reset wallet. Please try again.');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          {/* App Icon/Logo */}
          <View style={[styles.iconContainer, { backgroundColor: theme.colors.primary }]}>
            <Icon name="shield-lock" size={48} color={theme.colors.onPrimary} />
          </View>

          {/* App Name */}
          <Text style={[styles.appName, { color: theme.colors.text }]}>
            CANARY
          </Text>

          {/* PIN Input */}
          <PINInput
            title="Enter your PIN"
            subtitle="Enter your 6-digit PIN to unlock your wallet"
            onComplete={handlePinSubmit}
            error={error}
            loading={loading}
            testID="pin-entry"
          />

          {/* Forgot PIN and Switch Account */}
          <View style={styles.bottomLinks}>
            <TouchableOpacity
              style={styles.linkButton}
              onPress={handleForgotPin}
              disabled={loading}
            >
              <Text style={[styles.forgotText, { color: theme.colors.textSecondary }]}>
                Forgot PIN?
              </Text>
            </TouchableOpacity>

            <Text style={[styles.linkSeparator, { color: theme.colors.textSecondary }]}>•</Text>

            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => switchAccount()}
              disabled={loading}
            >
              <Text style={[styles.forgotText, { color: theme.colors.textSecondary }]}>
                Switch Account
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  appName: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 48,
  },
  linkButton: {
    padding: 12,
  },
  forgotText: {
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  bottomLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
  },
  linkSeparator: {
    marginHorizontal: 12,
    fontSize: 14,
  },
});