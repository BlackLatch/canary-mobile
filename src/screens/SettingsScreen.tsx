import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useWallet } from '../contexts/WalletContext';
import { useTheme } from '../contexts/ThemeContext';
import { ethers } from 'ethers';
import type { ThemeMode } from '../contexts/ThemeContext';

export const SettingsScreen = () => {
  const { address, balance, walletType, disconnect } = useWallet();
  const { theme, themeMode, setThemeMode } = useTheme();

  const formatAddress = (addr: string) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const formatBalance = (bal: ethers.BigNumber | null) => {
    if (!bal) return '0.00';
    return parseFloat(ethers.utils.formatEther(bal)).toFixed(4);
  };

  const handleDisconnect = () => {
    Alert.alert(
      'Disconnect Wallet',
      'Are you sure you want to disconnect your wallet? You can restore it later using your private key.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            try {
              await disconnect();
            } catch (error) {
              console.error('Failed to disconnect:', error);
              Alert.alert('Error', 'Failed to disconnect wallet');
            }
          },
        },
      ]
    );
  };

  const handleExportPrivateKey = () => {
    Alert.alert(
      'Export Private Key',
      'This feature will allow you to export your private key. Keep it safe and never share it with anyone!',
      [{ text: 'OK' }]
    );
  };

  const handleAbout = () => {
    Alert.alert(
      'About Canary',
      'Canary Testnet Demo\n\nVersion 1.0.0\n\nIf you go silent, Canary speaks for you.',
      [{ text: 'OK' }]
    );
  };

  const handleThemeModeChange = (mode: ThemeMode) => {
    setThemeMode(mode);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Theme Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Appearance</Text>

          <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
            <TouchableOpacity
              style={[styles.themeOption, { borderBottomColor: theme.colors.border }]}
              onPress={() => handleThemeModeChange('light')}
            >
              <View style={styles.themeOptionContent}>
                <Text style={[styles.themeOptionText, { color: theme.colors.text }]}>Light Mode</Text>
                {theme.colors.text === '#111827' && !theme.isDark && (
                  <View style={styles.checkmark}>
                    <Text style={{ color: theme.colors.primary }}>✓</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.themeOption, { borderBottomColor: theme.colors.border }]}
              onPress={() => handleThemeModeChange('dark')}
            >
              <View style={styles.themeOptionContent}>
                <Text style={[styles.themeOptionText, { color: theme.colors.text }]}>Dark Mode</Text>
                {theme.isDark && themeMode === 'dark' && (
                  <View style={styles.checkmark}>
                    <Text style={{ color: theme.colors.primary }}>✓</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.themeOption}
              onPress={() => handleThemeModeChange('system')}
            >
              <View style={styles.themeOptionContent}>
                <Text style={[styles.themeOptionText, { color: theme.colors.text }]}>System Default</Text>
                {themeMode === 'system' && (
                  <View style={styles.checkmark}>
                    <Text style={{ color: theme.colors.primary }}>✓</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Wallet Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Wallet</Text>

          <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
            <View style={[styles.infoRow, { borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Address</Text>
              <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                {address ? formatAddress(address) : 'Not connected'}
              </Text>
            </View>

            <View style={[styles.infoRow, { borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Balance</Text>
              <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                {formatBalance(balance)} ETH
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Type</Text>
              <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                {walletType === 'burner'
                  ? 'Burner Wallet'
                  : walletType === 'walletconnect'
                  ? 'WalletConnect'
                  : walletType === 'embedded'
                  ? 'Embedded Wallet'
                  : 'Unknown'}
              </Text>
            </View>
          </View>

          {walletType === 'burner' && (
            <>
              <TouchableOpacity
                style={[styles.menuButton, { backgroundColor: theme.colors.card }]}
                onPress={handleExportPrivateKey}
              >
                <Text style={[styles.menuButtonText, { color: theme.colors.text }]}>Export Private Key</Text>
                <Text style={[styles.menuButtonIcon, { color: theme.colors.textSecondary }]}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.menuButton, styles.dangerButton, { backgroundColor: theme.colors.card }]}
                onPress={handleDisconnect}
              >
                <Text style={[styles.menuButtonText, styles.dangerText]}>
                  Disconnect Wallet
                </Text>
                <Text style={[styles.menuButtonIcon, styles.dangerText]}>
                  ›
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Network Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Network</Text>

          <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
            <View style={[styles.infoRow, { borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Network</Text>
              <Text style={[styles.infoValue, { color: theme.colors.text }]}>Status Testnet</Text>
            </View>

            <View style={[styles.infoRow, { borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Chain ID</Text>
              <Text style={[styles.infoValue, { color: theme.colors.text }]}>11155111</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Status</Text>
              <View style={styles.statusBadge}>
                <View style={styles.statusDot} />
                <Text style={[styles.infoValue, { color: theme.colors.text }]}>Connected</Text>
              </View>
            </View>
          </View>
        </View>

        {/* App Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>App</Text>

          <TouchableOpacity style={[styles.menuButton, { backgroundColor: theme.colors.card }]} onPress={handleAbout}>
            <Text style={[styles.menuButtonText, { color: theme.colors.text }]}>About Canary</Text>
            <Text style={[styles.menuButtonIcon, { color: theme.colors.textSecondary }]}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuButton, { backgroundColor: theme.colors.card }]}
            onPress={() => Alert.alert('Privacy Policy', 'Coming soon...')}
          >
            <Text style={[styles.menuButtonText, { color: theme.colors.text }]}>Privacy Policy</Text>
            <Text style={[styles.menuButtonIcon, { color: theme.colors.textSecondary }]}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuButton, { backgroundColor: theme.colors.card }]}
            onPress={() => Alert.alert('Terms of Service', 'Coming soon...')}
          >
            <Text style={[styles.menuButtonText, { color: theme.colors.text }]}>Terms of Service</Text>
            <Text style={[styles.menuButtonIcon, { color: theme.colors.textSecondary }]}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: theme.colors.textSecondary }]}>
            Canary Testnet Demo v1.0.0
          </Text>
          <Text style={[styles.footerText, { color: theme.colors.textSecondary }]}>
            If you go silent, Canary speaks for you.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  themeOption: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  themeOptionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  themeOptionText: {
    fontSize: 16,
  },
  checkmark: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  infoLabel: {
    fontSize: 14,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  menuButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  menuButtonText: {
    fontSize: 16,
  },
  menuButtonIcon: {
    fontSize: 24,
  },
  dangerButton: {
    marginTop: 8,
  },
  dangerText: {
    color: '#E53935',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  footerText: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 4,
  },
});
