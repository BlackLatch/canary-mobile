import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  Clipboard,
  Modal,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/Feather';
import QRCode from 'react-native-qrcode-svg';
import { useWallet } from '../contexts/WalletContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNotifications } from '../contexts/NotificationContext';
import { burnerWalletService } from '../lib/burnerWallet';
import { contractService } from '../lib/contract';
import { ethers } from 'ethers';
import type { ThemeMode } from '../contexts/ThemeContext';

type StorageBackend = 'pinata' | 'ipfs' | 'codex';

const STORAGE_BACKEND_KEY = '@canary:storage_backend';

export const SettingsScreen = () => {
  const { address, balance, walletType, lockWallet, resetWallet, disconnect, switchAccount } = useWallet();
  const { theme, themeMode, setThemeMode } = useTheme();
  const { notificationsEnabled, toggleNotifications, isLoading } = useNotifications();

  const [storageBackend, setStorageBackend] = useState<StorageBackend>('pinata');
  const [showPrivateKeyModal, setShowPrivateKeyModal] = useState(false);
  const [privateKey, setPrivateKey] = useState('');
  const [showQRCodeModal, setShowQRCodeModal] = useState(false);

  // Load settings on mount
  React.useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const backend = await AsyncStorage.getItem(STORAGE_BACKEND_KEY);
      if (backend) setStorageBackend(backend as StorageBackend);
    } catch (error) {
      // console.error('Failed to load settings:', error);
    }
  };

  const formatAddress = (addr: string) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const formatBalance = (bal: ethers.BigNumber | null) => {
    if (!bal) return '0.00';
    return parseFloat(ethers.utils.formatEther(bal)).toFixed(4);
  };

  const handleStorageBackendChange = async (backend: StorageBackend) => {
    try {
      await AsyncStorage.setItem(STORAGE_BACKEND_KEY, backend);
      setStorageBackend(backend);
      Alert.alert('Storage Backend Changed', `Storage backend set to ${backend.toUpperCase()}`);
    } catch (error) {
      // console.error('Failed to save storage backend:', error);
      Alert.alert('Error', 'Failed to save storage backend');
    }
  };

  const handleExportPrivateKey = async () => {
    if (walletType !== 'burner') {
      Alert.alert('Not Available', 'Private key export is only available for local accounts');
      return;
    }

    Alert.alert(
      'Export Private Key',
      'Your private key will be displayed. Keep it safe and NEVER share it with anyone!',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Show Private Key',
          style: 'destructive',
          onPress: async () => {
            try {
              const pk = await burnerWalletService.exportPrivateKey();
              if (pk) {
                setPrivateKey(pk);
                setShowPrivateKeyModal(true);
              } else {
                Alert.alert('Error', 'Failed to export private key');
              }
            } catch (error) {
              // console.error('Failed to export private key:', error);
              Alert.alert('Error', 'Failed to export private key');
            }
          },
        },
      ]
    );
  };

  const handleCopyPrivateKey = () => {
    Clipboard.setString(privateKey);
    Alert.alert('Copied', 'Private key copied to clipboard');
  };

  const handleCopyAddress = () => {
    if (address) {
      Clipboard.setString(address);
      Alert.alert('Copied', 'Address copied to clipboard');
    }
  };

  const handleBurnWallet = () => {
    Alert.alert(
      'Burn Wallet',
      'This will PERMANENTLY delete your wallet and all associated data. This action cannot be undone!\n\nMake sure you have backed up your private key if you want to restore this wallet later.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Burn Wallet',
          style: 'destructive',
          onPress: async () => {
            try {
              await burnerWalletService.deleteWallet();
              await disconnect();
              Alert.alert('Wallet Burned', 'Your wallet has been permanently deleted');
            } catch (error) {
              // console.error('Failed to burn wallet:', error);
              Alert.alert('Error', 'Failed to delete wallet');
            }
          },
        },
      ]
    );
  };

  const handleClearLocalData = () => {
    Alert.alert(
      'Clear Local Data',
      'This will clear all app data except your wallet. You will need to recreate any dossiers.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Data',
          style: 'destructive',
          onPress: async () => {
            try {
              // Clear all AsyncStorage except wallet keys
              const keys = await AsyncStorage.getAllKeys();
              const keysToRemove = keys.filter(
                k => !k.includes('burner_wallet') && !k.includes('wallet_type')
              );
              await AsyncStorage.multiRemove(keysToRemove);
              Alert.alert('Data Cleared', 'Local data has been cleared');
            } catch (error) {
              // console.error('Failed to clear data:', error);
              Alert.alert('Error', 'Failed to clear local data');
            }
          },
        },
      ]
    );
  };

  const handleDisconnect = () => {
    Alert.alert(
      'Logout Options',
      'Choose how you want to logout:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Lock',
          onPress: () => {
            lockWallet();
          },
        },
        {
          text: 'Switch Account',
          style: 'destructive',
          onPress: async () => {
            Alert.alert(
              'Switch Account',
              'This will log you out and return to the login screen. Your current wallet will remain stored on this device.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Continue',
                  style: 'default',
                  onPress: () => {
                    switchAccount();
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const handleThemeModeChange = (mode: ThemeMode) => {
    setThemeMode(mode);
  };


  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Screen Header */}
        <View style={styles.screenHeader}>
          <View style={styles.screenTitleRow}>
            <View style={styles.screenTitleLeft}>
              <Icon name="settings" size={32} color="#e53e3e" />
              <Text style={[styles.screenTitle, { color: theme.colors.text }]}>SETTINGS</Text>
            </View>
            <Image
              source={require('../assets/canary-icon.png')}
              style={styles.canaryIcon}
              resizeMode="contain"
            />
          </View>
          <Text style={[styles.screenSubtitle, { color: theme.colors.textSecondary }]}>
            Configure your preferences and manage your account
          </Text>
        </View>

        {/* Appearance Section */}
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

        {/* Notifications Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Notifications</Text>
          <Text style={[styles.sectionDescription, { color: theme.colors.textSecondary }]}>
            Get reminded when your check-in deadline is approaching
          </Text>

          <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
            <View style={styles.switchRow}>
              <View style={styles.switchContent}>
                <Text style={[styles.switchTitle, { color: theme.colors.text }]}>
                  Check-In Reminders
                </Text>
                <Text style={[styles.switchDescription, { color: theme.colors.textSecondary }]}>
                  Receive notifications at 24hr, 1hr, and 15min before your deadline
                </Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={toggleNotifications}
                disabled={isLoading}
                trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                thumbColor="#FFFFFF"
                ios_backgroundColor={theme.colors.border}
              />
            </View>
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
                  ? 'Local Account'
                  : walletType === 'walletconnect'
                  ? 'WalletConnect'
                  : walletType === 'embedded'
                  ? 'Embedded Wallet'
                  : 'Unknown'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.menuButton, { backgroundColor: theme.colors.card }]}
            onPress={() => setShowQRCodeModal(true)}
          >
            <Text style={[styles.menuButtonText, { color: theme.colors.text }]}>
              Show QR Code
            </Text>
            <Text style={[styles.menuButtonIcon, { color: theme.colors.textSecondary }]}>›</Text>
          </TouchableOpacity>

          {walletType === 'burner' && (
            <>
              <TouchableOpacity
                style={[styles.menuButton, { backgroundColor: theme.colors.card }]}
                onPress={handleExportPrivateKey}
              >
                <Text style={[styles.menuButtonText, { color: theme.colors.text }]}>
                  Backup Private Key
                </Text>
                <Text style={[styles.menuButtonIcon, { color: theme.colors.textSecondary }]}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.menuButton, styles.dangerButton, { backgroundColor: theme.colors.card }]}
                onPress={handleBurnWallet}
              >
                <Text style={[styles.menuButtonText, styles.dangerText]}>
                  Delete Account
                </Text>
                <Text style={[styles.menuButtonIcon, styles.dangerText]}>
                  ›
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.menuButton, styles.dangerButton, { backgroundColor: theme.colors.card }]}
                onPress={handleDisconnect}
              >
                <Text style={[styles.menuButtonText, styles.dangerText]}>
                  Logout
                </Text>
                <Text style={[styles.menuButtonIcon, styles.dangerText]}>
                  ›
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Storage Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Storage</Text>
          <Text style={[styles.sectionDescription, { color: theme.colors.textSecondary }]}>
            Choose where your encrypted dossiers are stored
          </Text>

          <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
            <TouchableOpacity
              style={[styles.storageOption, { borderBottomColor: theme.colors.border }]}
              onPress={() => handleStorageBackendChange('pinata')}
            >
              <View style={styles.storageOptionContent}>
                <Text style={[styles.storageOptionTitle, { color: theme.colors.text }]}>Pinata</Text>
                <Text style={[styles.storageOptionDesc, { color: theme.colors.textSecondary }]}>
                  IPFS pinning service (recommended)
                </Text>
              </View>
              {storageBackend === 'pinata' && (
                <View style={styles.checkmark}>
                  <Text style={{ color: theme.colors.primary }}>✓</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.storageOption, { borderBottomColor: theme.colors.border }]}
              onPress={() => handleStorageBackendChange('ipfs')}
            >
              <View style={styles.storageOptionContent}>
                <Text style={[styles.storageOptionTitle, { color: theme.colors.text }]}>IPFS</Text>
                <Text style={[styles.storageOptionDesc, { color: theme.colors.textSecondary }]}>
                  Direct IPFS node connection
                </Text>
              </View>
              {storageBackend === 'ipfs' && (
                <View style={styles.checkmark}>
                  <Text style={{ color: theme.colors.primary }}>✓</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.storageOption}
              onPress={() => handleStorageBackendChange('codex')}
            >
              <View style={styles.storageOptionContent}>
                <Text style={[styles.storageOptionTitle, { color: theme.colors.text }]}>Codex</Text>
                <Text style={[styles.storageOptionDesc, { color: theme.colors.textSecondary }]}>
                  Decentralized storage network
                </Text>
              </View>
              {storageBackend === 'codex' && (
                <View style={styles.checkmark}>
                  <Text style={{ color: theme.colors.primary }}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Privacy & Security Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Privacy & Security</Text>

          <TouchableOpacity
            style={[styles.menuButton, styles.dangerButton, { backgroundColor: theme.colors.card }]}
            onPress={handleClearLocalData}
          >
            <Text style={[styles.menuButtonText, styles.dangerText]}>
              Clear Local Data
            </Text>
            <Text style={[styles.menuButtonIcon, styles.dangerText]}>›</Text>
          </TouchableOpacity>
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

        {/* Advanced Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Advanced</Text>

          <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Contract Information</Text>

            <View style={[styles.infoRow, { borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Contract</Text>
              <Text style={[styles.infoValue, { color: theme.colors.text }]}>Canary Registry</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Address</Text>
              <Text style={[styles.infoValue, { color: theme.colors.text, fontSize: 11 }]}>
                {formatAddress(contractService.getContractAddress())}
              </Text>
            </View>
          </View>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>About</Text>

          <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.cardDescription, { color: theme.colors.textSecondary }]}>
              Canary Testnet Demo{'\n'}
              Version 1.0.0{'\n\n'}
              If you go silent, Canary speaks for you.
            </Text>
          </View>
        </View>

        {/* Footer spacing */}
        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Private Key Modal */}
      <Modal
        visible={showPrivateKeyModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPrivateKeyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              Private Key
            </Text>
            <Text style={[styles.modalWarning, { color: '#EF4444' }]}>
              ⚠️ Never share this with anyone!
            </Text>

            <View style={[styles.privateKeyContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <Text style={[styles.privateKeyText, { color: theme.colors.text }]} selectable>
                {privateKey}
              </Text>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary, { borderColor: theme.colors.border }]}
                onPress={handleCopyPrivateKey}
              >
                <Text style={[styles.modalButtonText, { color: theme.colors.text }]}>Copy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary, { backgroundColor: theme.colors.primary }]}
                onPress={() => {
                  setShowPrivateKeyModal(false);
                  setPrivateKey('');
                }}
              >
                <Text style={[styles.modalButtonText, { color: '#FFFFFF' }]}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* QR Code Modal */}
      <Modal
        visible={showQRCodeModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowQRCodeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              Account Address
            </Text>
            <Text style={[styles.modalDescription, { color: theme.colors.textSecondary }]}>
              Scan this QR code to receive funds
            </Text>

            {address && (
              <View style={styles.qrCodeContainer}>
                <QRCode
                  value={address}
                  size={200}
                  backgroundColor="white"
                  color="black"
                />
              </View>
            )}

            <View style={[styles.addressContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <Text style={[styles.addressText, { color: theme.colors.text }]} selectable>
                {address}
              </Text>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary, { borderColor: theme.colors.border }]}
                onPress={handleCopyAddress}
              >
                <Text style={[styles.modalButtonText, { color: theme.colors.text }]}>Copy Address</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary, { backgroundColor: theme.colors.primary }]}
                onPress={() => setShowQRCodeModal(false)}
              >
                <Text style={[styles.modalButtonText, { color: '#FFFFFF' }]}>Done</Text>
              </TouchableOpacity>
            </View>
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
  scrollContent: {
    paddingBottom: 16,
  },
  section: {
    marginBottom: 32,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
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
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    lineHeight: 20,
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
  storageOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  storageOptionContent: {
    flex: 1,
  },
  storageOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  storageOptionDesc: {
    fontSize: 13,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchContent: {
    flex: 1,
  },
  switchTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  switchDescription: {
    fontSize: 13,
  },
  codePhraseButton: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 12,
  },
  codePhraseText: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    fontFamily: 'monospace',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalWarning: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },
  modalDescription: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  privateKeyContainer: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 20,
  },
  privateKeyText: {
    fontSize: 12,
    fontFamily: 'monospace',
    lineHeight: 18,
  },
  codePhraseContainer: {
    padding: 20,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 20,
  },
  codePhraseDisplayText: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    fontFamily: 'monospace',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonPrimary: {
    // backgroundColor set dynamically
  },
  modalButtonSecondary: {
    borderWidth: 1,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  qrCodeContainer: {
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 12,
    marginVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressContainer: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 20,
  },
  addressText: {
    fontSize: 12,
    fontFamily: 'monospace',
    lineHeight: 18,
    textAlign: 'center',
  },
  // Screen Header Styles
  screenHeader: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    marginBottom: 8,
  },
  screenTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  screenTitleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 1,
  },
  screenSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginLeft: 44,
  },
  canaryIcon: {
    width: 32,
    height: 32,
  },
});
