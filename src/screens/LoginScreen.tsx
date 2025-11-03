import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useWallet } from '../contexts/WalletContext';

export const LoginScreen = () => {
  const { connectBurnerWallet, address, isConnecting } = useWallet();
  const [hasExistingWallet, setHasExistingWallet] = useState<boolean | null>(null);

  useEffect(() => {
    // Check if there's an existing burner wallet
    // The WalletContext auto-connects on mount, so we just check if address exists
    const timer = setTimeout(() => {
      setHasExistingWallet(!!address);
    }, 100);

    return () => clearTimeout(timer);
  }, [address]);

  const handleConnect = async () => {
    try {
      await connectBurnerWallet();
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    }
  };

  if (hasExistingWallet === null) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E53935" />
      </View>
    );
  }

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
            <Text style={styles.logoText}>CANARY</Text>
          </View>

          <Text style={styles.title}>Canary Testnet Demo</Text>

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
          {hasExistingWallet ? (
            <>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleConnect}
                disabled={isConnecting}
              >
                {isConnecting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>
                    RESTORE ACCOUNT
                  </Text>
                )}
              </TouchableOpacity>

              <Text style={styles.accountInfo}>
                Anonymous account detected
              </Text>
            </>
          ) : (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleConnect}
              disabled={isConnecting}
            >
              {isConnecting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  CREATE ANONYMOUS ACCOUNT
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Anonymous burner wallet • No personal data collected
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
  },
  logo: {
    height: 24,
    width: 24,
    marginRight: 12,
  },
  logoText: {
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 2,
    color: '#111827',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
    textAlign: 'center',
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
  accountInfo: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
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
