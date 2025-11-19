import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useWallet } from '../contexts/WalletContext';
import { ethers } from 'ethers';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { ErrorDialog } from '../components/ErrorDialog';

type ImportMode = 'seed' | 'private';

export const ImportAccountScreen = () => {
  const navigation = useNavigation<any>();

  const [mode, setMode] = useState<ImportMode>('seed');
  const [seedPhrase, setSeedPhrase] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateSeedPhrase = (phrase: string): boolean => {
    try {
      const words = phrase.trim().split(/\s+/);
      if (![12, 15, 18, 21, 24].includes(words.length)) {
        return false;
      }
      ethers.Wallet.fromMnemonic(phrase.trim());
      return true;
    } catch {
      return false;
    }
  };

  const validatePrivateKey = (key: string): boolean => {
    let cleanKey = key.trim();
    if (cleanKey.startsWith('0x') || cleanKey.startsWith('0X')) {
      cleanKey = cleanKey.substring(2);
    }
    return /^[a-fA-F0-9]{64}$/.test(cleanKey);
  };

  const handleImport = async () => {
    setError(null);
    setIsLoading(true);

    try {
      if (mode === 'seed') {
        const trimmedPhrase = seedPhrase.trim();

        if (!trimmedPhrase) {
          setError('Please enter your seed phrase');
          setIsLoading(false);
          return;
        }

        if (!validateSeedPhrase(trimmedPhrase)) {
          setError('Invalid seed phrase. Please check and try again.');
          setIsLoading(false);
          return;
        }

        // Convert seed phrase to private key
        const wallet = ethers.Wallet.fromMnemonic(trimmedPhrase);

        // Navigate to PIN creation screen with private key
        navigation.navigate('CreatePIN', {
          mode: 'import',
          privateKey: wallet.privateKey
        });
      } else {
        let cleanKey = privateKey.trim();

        if (!cleanKey) {
          setError('Please enter your private key');
          setIsLoading(false);
          return;
        }

        // Add 0x prefix if missing
        if (!cleanKey.startsWith('0x')) {
          cleanKey = '0x' + cleanKey;
        }

        if (!validatePrivateKey(cleanKey.substring(2))) {
          setError('Invalid private key. It should be 64 hexadecimal characters.');
          setIsLoading(false);
          return;
        }

        // Navigate to PIN creation screen with private key
        navigation.navigate('CreatePIN', {
          mode: 'import',
          privateKey: cleanKey
        });
      }
    } catch (error: any) {
      console.error('Import validation failed:', error);
      setError(error.message || 'Failed to validate account');
    } finally {
      setIsLoading(false);
    }
  };

  const getWordCount = () => {
    const words = seedPhrase.trim().split(/\s+/);
    return words.length === 1 && words[0] === '' ? 0 : words.length;
  };

  const isValidWordCount = () => {
    const count = getWordCount();
    return [12, 15, 18, 21, 24].includes(count);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Icon name="arrow-left" size={24} color="#111827" />
            </TouchableOpacity>
            <Text style={styles.title}>Import Account</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Mode Selector */}
          <View style={styles.modeSelector}>
            <TouchableOpacity
              style={[
                styles.modeButton,
                mode === 'seed' && styles.modeButtonActive,
              ]}
              onPress={() => setMode('seed')}
            >
              <Text
                style={[
                  styles.modeButtonText,
                  mode === 'seed' && styles.modeButtonTextActive,
                ]}
              >
                Seed Phrase
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modeButton,
                mode === 'private' && styles.modeButtonActive,
              ]}
              onPress={() => setMode('private')}
            >
              <Text
                style={[
                  styles.modeButtonText,
                  mode === 'private' && styles.modeButtonTextActive,
                ]}
              >
                Private Key
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            {mode === 'seed' ? (
              <>
                <View style={styles.inputSection}>
                  <Text style={styles.label}>Recovery Phrase</Text>
                  <Text style={styles.helperText}>
                    Enter your 12, 15, 18, 21, or 24 word recovery phrase
                  </Text>
                  <TextInput
                    style={[styles.textArea, !isValidWordCount() && getWordCount() > 0 && styles.inputError]}
                    multiline
                    numberOfLines={4}
                    placeholder="Enter your recovery phrase..."
                    placeholderTextColor="#9CA3AF"
                    value={seedPhrase}
                    onChangeText={setSeedPhrase}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <Text style={[
                    styles.wordCount,
                    isValidWordCount() ? styles.wordCountValid : styles.wordCountInvalid
                  ]}>
                    {getWordCount()} words {isValidWordCount() && '✓'}
                  </Text>
                </View>

                <View style={styles.infoBox}>
                  <Icon name="information" size={20} color="#3B82F6" />
                  <Text style={styles.infoText}>
                    Your seed phrase is the master key to your wallet. Keep it secure and never share it with anyone.
                  </Text>
                </View>
              </>
            ) : (
              <>
                <View style={styles.inputSection}>
                  <Text style={styles.label}>Private Key</Text>
                  <Text style={styles.helperText}>
                    Enter your private key (64 hexadecimal characters)
                  </Text>
                  <TextInput
                    style={[styles.textArea, privateKey && !validatePrivateKey(privateKey) && styles.inputError]}
                    multiline
                    numberOfLines={3}
                    placeholder="Enter your private key..."
                    placeholderTextColor="#9CA3AF"
                    value={privateKey}
                    onChangeText={setPrivateKey}
                    autoCapitalize="none"
                    autoCorrect={false}
                    secureTextEntry={false}
                  />
                </View>

                <View style={styles.warningBox}>
                  <Icon name="alert" size={20} color="#EF4444" />
                  <Text style={styles.warningText}>
                    Never share your private key. Anyone with your private key can access and control your wallet.
                  </Text>
                </View>
              </>
            )}

            <View style={styles.pinInfoBox}>
              <Icon name="lock" size={20} color="#3B82F6" />
              <Text style={styles.infoText}>
                After import, you'll set up a 6-digit PIN to secure your wallet on this device.
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.importButton,
                isLoading && styles.importButtonDisabled,
              ]}
              onPress={handleImport}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.importButtonText}>Import Account</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <ErrorDialog
        visible={!!error}
        message={error || ''}
        onClose={() => setError(null)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  modeSelector: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 20,
    backgroundColor: '#E5E7EB',
    borderRadius: 8,
    padding: 2,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  modeButtonActive: {
    backgroundColor: '#FFFFFF',
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  modeButtonTextActive: {
    color: '#111827',
  },
  content: {
    padding: 20,
  },
  inputSection: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  helperText: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
  },
  textArea: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#111827',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: '#EF4444',
  },
  wordCount: {
    fontSize: 12,
    marginTop: 4,
  },
  wordCountValid: {
    color: '#10B981',
  },
  wordCountInvalid: {
    color: '#6B7280',
  },
  visibilityToggle: {
    position: 'absolute',
    right: 12,
    top: 40,
    padding: 8,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#EBF5FF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#1E40AF',
    marginLeft: 8,
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    color: '#991B1B',
    marginLeft: 8,
  },
  pinInfoBox: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  sectionHelperText: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 12,
  },
  passwordInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#111827',
  },
  passwordToggle: {
    position: 'absolute',
    right: 12,
    padding: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#111827',
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
  },
  importButton: {
    backgroundColor: '#111827',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  importButtonDisabled: {
    opacity: 0.5,
  },
  importButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
