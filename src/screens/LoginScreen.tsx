import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useWallet } from '../contexts/WalletContext';
import { WalletConnectModal } from '../components/WalletConnectModal';
import { pinWalletService } from '../lib/pinWallet';

export const LoginScreen = ({ navigation }: any) => {
  const { isConnecting, cancelAccountSwitch } = useWallet();
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [localAccount, setLocalAccount] = useState<string | null>(null);
  const [isCheckingAccount, setIsCheckingAccount] = useState(true);

  // Re-check for local account whenever screen comes into focus
  // This ensures we update if wallet was reset from another screen
  useFocusEffect(
    React.useCallback(() => {
      checkForLocalAccount();
    }, [])
  );

  const checkForLocalAccount = async () => {
    try {
      console.log('🔍 LoginScreen: Checking for local account...');
      // Check for PIN-protected wallet
      const hasWallet = await pinWalletService.hasWallet();
      console.log('🔍 LoginScreen: hasWallet =', hasWallet);
      if (hasWallet) {
        const address = await pinWalletService.getWalletAddress();
        console.log('🔍 LoginScreen: wallet address =', address);
        if (address) {
          setLocalAccount(address);
        } else {
          setLocalAccount(null);
        }
      } else {
        setLocalAccount(null);
      }
    } catch (error) {
      console.log('🔍 LoginScreen: No accessible local account found', error);
      setLocalAccount(null);
    } finally {
      setIsCheckingAccount(false);
    }
  };

  const handleNewAccount = () => {
    // Navigate to PIN creation screen for new account
    navigation.navigate('CreatePIN', { mode: 'create' });
  };

  const handleImportAccount = () => {
    if (localAccount) {
      Alert.alert(
        'Replace Current Wallet?',
        'Importing a new account will replace your current wallet on this device. Make sure you have backed up your current wallet\'s seed phrase or private key before proceeding.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Continue',
            style: 'destructive',
            onPress: () => navigation.navigate('ImportAccount'),
          },
        ]
      );
    } else {
      navigation.navigate('ImportAccount');
    }
  };

  const handleUseLocalAccount = () => {
    // Cancel the account switch to show PIN entry screen
    cancelAccountSwitch();
  };

  const handleConnectWallet = () => {
    setShowWalletModal(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Logo and Branding */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Image
              source={require('../../assets/solo-canary.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.logoText}>CANARY [BETA]</Text>
          </View>

          <View style={styles.subtitleContainer}>
            <Text style={styles.subtitle}>
              If you go silent,{' '}
              <Text style={styles.subtitleAccent}>Canary</Text>
              {' '}speaks for you.
            </Text>
          </View>
        </View>

        {/* Authentication Buttons */}
        <View style={styles.authSection}>
          {/* Show LOG IN button if account exists */}
          {!isCheckingAccount && localAccount && (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleUseLocalAccount}
              disabled={isConnecting}
            >
              {isConnecting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>LOG IN</Text>
              )}
            </TouchableOpacity>
          )}

          {/* Only show New Account if no account exists */}
          {!localAccount && (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleNewAccount}
              disabled={isConnecting}
            >
              {isConnecting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  NEW ACCOUNT
                </Text>
              )}
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={localAccount ? styles.primaryButton : styles.secondaryButton}
            onPress={handleImportAccount}
            disabled={isConnecting}
          >
            <Text style={localAccount ? styles.primaryButtonText : styles.secondaryButtonText}>
              IMPORT ACCOUNT
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleConnectWallet}
            disabled={isConnecting}
          >
            <Text style={styles.secondaryButtonText}>
              CONNECT WALLET
            </Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Local account • No personal data collected
          </Text>
        </View>
      </View>

      <WalletConnectModal
        visible={showWalletModal}
        onClose={() => setShowWalletModal(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 48,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginTop: 60,
  },
  logoContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: 32,
  },
  logo: {
    height: 48,
    width: 48,
    marginBottom: 12,
  },
  logoText: {
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 2,
    color: '#111827',
  },
  subtitleContainer: {
    paddingHorizontal: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  subtitleAccent: {
    color: '#E53935',
    fontWeight: '600',
  },
  authSection: {
    width: '100%',
    alignItems: 'center',
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#000000',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#000000',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#D1D5DB',
  },
  secondaryButtonText: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  footerText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});
