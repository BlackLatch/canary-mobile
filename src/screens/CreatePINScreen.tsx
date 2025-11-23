/**
 * Create PIN Screen
 *
 * Screen for setting up a new PIN when creating or importing a wallet
 */

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Text,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { PINInput } from '../components/PINInput';
import { useTheme } from '../contexts/ThemeContext';
import { useWallet } from '../contexts/WalletContext';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Navigation types
type RootStackParamList = {
  CreatePIN: {
    mode: 'create' | 'import';
    privateKey?: string; // For import mode
    mnemonic?: string; // For import mode
  };
  Main: undefined;
};

type CreatePINNavigationProp = StackNavigationProp<RootStackParamList, 'CreatePIN'>;
type CreatePINRouteProp = RouteProp<RootStackParamList, 'CreatePIN'>;

interface CreatePINScreenProps {
  navigation: CreatePINNavigationProp;
  route: CreatePINRouteProp;
}

export const CreatePINScreen: React.FC<CreatePINScreenProps> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { createPinProtectedWallet, importWalletWithPin } = useWallet();
  const { mode, privateKey, mnemonic } = route.params || { mode: 'create' };

  const [step, setStep] = useState<'create' | 'confirm'>('create');
  const [firstPin, setFirstPin] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  /**
   * Handle first PIN entry
   */
  const handleFirstPin = (pin: string) => {
    // Basic PIN validation
    if (hasRepeatingDigits(pin)) {
      setError('PIN cannot have all the same digits');
      return;
    }

    if (hasSequentialDigits(pin)) {
      setError('PIN cannot be sequential (e.g., 123456)');
      return;
    }

    setFirstPin(pin);
    setError(undefined);
    setStep('confirm');
  };

  /**
   * Handle PIN confirmation
   */
  const handleConfirmPin = async (pin: string) => {
    // console.log('handleConfirmPin called with pin length:', pin.length);
    // console.log('First PIN length:', firstPin.length);
    // console.log('PINs match:', pin === firstPin);

    if (pin !== firstPin) {
      setError('PINs do not match. Please try again.');
      // Reset to first step
      setTimeout(() => {
        setFirstPin('');
        setStep('create');
        setError(undefined);
      }, 1500);
      return;
    }

    // PINs match - proceed with wallet creation/import
    // console.log('PINs match! Proceeding with mode:', mode);
    setLoading(true);
    setError(undefined);

    try {
      if (mode === 'create') {
        // Create new wallet with PIN
        // console.log('Creating new PIN-protected wallet...');
        await createPinProtectedWallet(pin);
        // console.log('Wallet created successfully');
      } else if (mode === 'import' && privateKey) {
        // Import existing wallet with PIN
        // console.log('Importing wallet with PIN...');
        await importWalletWithPin(privateKey, pin);
        // console.log('Wallet imported successfully');
      } else if (mode === 'import' && mnemonic) {
        // Convert mnemonic to private key first (if needed)
        // For now, assuming privateKey is provided
        throw new Error('Mnemonic import not yet implemented');
      }

      // Success - wallet is created and unlocked
      // Navigation will be handled by AuthenticatedApp
      // console.log('Success - wallet operation complete');

      // Clear loading state after successful creation
      // This is critical to prevent the app from hanging with loading modal
      setLoading(false);
      setError(undefined);
    } catch (err: any) {
      // console.error('PIN creation error:', err);
      setError(err.message || 'Failed to create PIN. Please try again.');
      setLoading(false);
    }
  };

  /**
   * Check for repeating digits (e.g., 111111)
   */
  const hasRepeatingDigits = (pin: string): boolean => {
    return /^(\d)\1{5}$/.test(pin);
  };

  /**
   * Check for sequential digits (e.g., 123456 or 654321)
   */
  const hasSequentialDigits = (pin: string): boolean => {
    const ascending = '012345678901234567890';
    const descending = '098765432109876543210';
    return ascending.includes(pin) || descending.includes(pin);
  };

  /**
   * Handle back navigation
   */
  const handleBack = () => {
    if (step === 'confirm') {
      setStep('create');
      setFirstPin('');
      setError(undefined);
    } else {
      navigation.goBack();
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Back Button */}
          <View style={styles.header}>
            <Icon
              name="arrow-left"
              size={24}
              color={theme.colors.text}
              onPress={handleBack}
              style={styles.backButton}
            />
          </View>

          <View style={styles.content}>
            {/* Step Indicator */}
            <View style={styles.stepContainer}>
              <View
                style={[
                  styles.stepDot,
                  { backgroundColor: theme.colors.primary },
                ]}
              />
              <View
                style={[
                  styles.stepLine,
                  {
                    backgroundColor:
                      step === 'confirm'
                        ? theme.colors.primary
                        : theme.colors.surfaceVariant,
                  },
                ]}
              />
              <View
                style={[
                  styles.stepDot,
                  {
                    backgroundColor:
                      step === 'confirm'
                        ? theme.colors.primary
                        : theme.colors.surfaceVariant,
                  },
                ]}
              />
            </View>

            {/* Icon */}
            <View style={[styles.iconContainer, { backgroundColor: theme.colors.primary }]}>
              <Icon
                name={step === 'create' ? 'lock-plus' : 'lock-check'}
                size={48}
                color={theme.colors.onPrimary}
              />
            </View>

            {/* PIN Input */}
            <PINInput
              key={step}
              title={step === 'create' ? 'Create your PIN' : 'Confirm your PIN'}
              subtitle={
                step === 'create'
                  ? 'Choose a 6-digit PIN to secure your wallet'
                  : 'Enter your PIN again to confirm'
              }
              onComplete={step === 'create' ? handleFirstPin : handleConfirmPin}
              error={error}
              loading={loading}
              showDigits={false}
              testID={step === 'create' ? 'pin-create' : 'pin-confirm'}
            />

            {/* Security Tips */}
            {step === 'create' && (
              <View style={styles.tipsContainer}>
                <Text style={[styles.tipsTitle, { color: theme.colors.text }]}>
                  PIN Security Tips:
                </Text>
                <View style={styles.tipRow}>
                  <Icon name="check-circle" size={16} color={theme.colors.primary} />
                  <Text style={[styles.tipText, { color: theme.colors.textSecondary }]}>
                    Use a unique PIN you haven't used elsewhere
                  </Text>
                </View>
                <View style={styles.tipRow}>
                  <Icon name="check-circle" size={16} color={theme.colors.primary} />
                  <Text style={[styles.tipText, { color: theme.colors.textSecondary }]}>
                    Avoid simple patterns like 123456 or 111111
                  </Text>
                </View>
                <View style={styles.tipRow}>
                  <Icon name="check-circle" size={16} color={theme.colors.primary} />
                  <Text style={[styles.tipText, { color: theme.colors.textSecondary }]}>
                    Don't use birthdays or easily guessable numbers
                  </Text>
                </View>
                <View style={styles.tipRow}>
                  <Icon name="alert-circle" size={16} color={theme.colors.error} />
                  <Text style={[styles.tipText, { color: theme.colors.textSecondary }]}>
                    If you forget your PIN, you'll need to reset your wallet
                  </Text>
                </View>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Loading Overlay */}
      <Modal
        visible={loading}
        transparent
        animationType="fade"
      >
        <View style={styles.loadingOverlay}>
          <View style={[styles.loadingCard, { backgroundColor: theme.colors.surface }]}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={[styles.loadingText, { color: theme.colors.text }]}>
              {mode === 'create' ? 'Creating your account...' : 'Importing your account...'}
            </Text>
            <Text style={[styles.loadingSubtext, { color: theme.colors.textSecondary }]}>
              This may take a few seconds
            </Text>
          </View>
        </View>
      </Modal>
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
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    padding: 20,
  },
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 40,
  },
  stepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  stepLine: {
    width: 60,
    height: 2,
    marginHorizontal: 8,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  tipsContainer: {
    width: '100%',
    marginTop: 40,
    paddingHorizontal: 20,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 8,
  },
  tipText: {
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  loadingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingCard: {
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    minWidth: 250,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  loadingSubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});