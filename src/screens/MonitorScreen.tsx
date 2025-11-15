/**
 * Monitor (RECEIVE) Screen
 *
 * Shows two main sections:
 * 1. Private Recipient Dossiers - Dossiers where the current user is a private recipient
 * 2. Emergency Contacts - Manually tracked contacts for quick access
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import { useWallet } from '../contexts/WalletContext';
import { useTheme } from '../contexts/ThemeContext';
import { EmptyState } from '../components/EmptyState';
import * as ContractService from '../lib/contract';
import type { RecipientDossier, EmergencyContact, Address, DossierReference } from '../types/dossier';

// Ethereum address validation
const isValidAddress = (address: string): boolean => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

export const MonitorScreen = () => {
  const insets = useSafeAreaInsets();
  const { address } = useWallet();
  const { theme } = useTheme();

  // State
  const [recipientDossiers, setRecipientDossiers] = useState<RecipientDossier[]>([]);
  const [isLoadingDossiers, setIsLoadingDossiers] = useState(true);
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);
  const [hasLoadedContacts, setHasLoadedContacts] = useState(false);
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [newContactLabel, setNewContactLabel] = useState('');
  const [newContactAddress, setNewContactAddress] = useState('');

  // Get storage key for current account
  const getStorageKey = (): string | null => {
    if (!address) return null;
    return `canary-emergency-contacts-${address.toLowerCase()}`;
  };

  // Load emergency contacts from AsyncStorage
  useEffect(() => {
    const loadContacts = async () => {
      if (!address) {
        setEmergencyContacts([]);
        setHasLoadedContacts(true);
        return;
      }

      const storageKey = getStorageKey();
      if (!storageKey) {
        setEmergencyContacts([]);
        setHasLoadedContacts(true);
        return;
      }

      try {
        const saved = await AsyncStorage.getItem(storageKey);
        if (saved) {
          const contacts = JSON.parse(saved);
          setEmergencyContacts(contacts);
          console.log(`✅ Loaded ${contacts.length} emergency contacts for ${address}`);
        } else {
          setEmergencyContacts([]);
        }
      } catch (error) {
        console.error('Failed to load emergency contacts:', error);
        setEmergencyContacts([]);
      }
      setHasLoadedContacts(true);
    };

    setHasLoadedContacts(false);
    loadContacts();
  }, [address]);

  // Save contacts to AsyncStorage whenever they change
  useEffect(() => {
    if (!hasLoadedContacts) return;

    const saveContacts = async () => {
      const storageKey = getStorageKey();
      if (!storageKey) return;

      try {
        await AsyncStorage.setItem(storageKey, JSON.stringify(emergencyContacts));
        console.log(`Saved ${emergencyContacts.length} emergency contacts for ${address}`);
      } catch (error) {
        console.error('Failed to save emergency contacts:', error);
      }
    };

    saveContacts();
  }, [emergencyContacts, hasLoadedContacts]);

  // Load recipient dossiers from blockchain
  const loadRecipientDossiers = async () => {
    if (!address) {
      setRecipientDossiers([]);
      setIsLoadingDossiers(false);
      return;
    }

    setIsLoadingDossiers(true);

    try {
      console.log('📋 Loading dossiers where user is a private recipient...');

      // Get all dossier references where user is a recipient
      const references: DossierReference[] = await ContractService.getDossiersWhereRecipient(address);
      console.log(`Found ${references.length} dossier(s) where ${address} is a recipient`);

      if (references.length === 0) {
        setRecipientDossiers([]);
        setIsLoadingDossiers(false);
        return;
      }

      // Load full details for each dossier (excluding own dossiers)
      const dossiers: RecipientDossier[] = [];

      for (const ref of references) {
        // Skip dossiers owned by the current user
        if (ref.owner.toLowerCase() === address.toLowerCase()) {
          console.log(`Skipping own dossier ${ref.dossierId}`);
          continue;
        }

        try {
          const dossier = await ContractService.getDossier(ref.owner, ref.dossierId);
          if (!dossier) continue;

          const shouldStayEncrypted = await ContractService.shouldDossierStayEncrypted(ref.owner, ref.dossierId);

          // Check if guardian threshold is met (only for dossiers with guardians)
          let isThresholdMet = false;
          if (dossier.guardians && dossier.guardians.length > 0) {
            isThresholdMet = await ContractService.isGuardianThresholdMet(ref.owner, ref.dossierId);
          }

          dossiers.push({
            ...dossier,
            owner: ref.owner,
            isDecryptable: !shouldStayEncrypted,
            isThresholdMet,
          });
        } catch (error) {
          console.error(`Failed to load dossier ${ref.dossierId} for owner ${ref.owner}:`, error);
        }
      }

      setRecipientDossiers(dossiers);
      console.log(`✅ Loaded ${dossiers.length} recipient dossier(s) from other accounts`);
    } catch (error) {
      console.error('Failed to load recipient dossiers:', error);
    } finally {
      setIsLoadingDossiers(false);
    }
  };

  useEffect(() => {
    loadRecipientDossiers();
  }, [address]);

  // Add emergency contact
  const handleAddContact = () => {
    const trimmedLabel = newContactLabel.trim();
    const trimmedAddress = newContactAddress.trim();

    if (!trimmedLabel || !trimmedAddress) {
      Alert.alert('Error', 'Please enter both a label and an address');
      return;
    }

    if (!isValidAddress(trimmedAddress)) {
      Alert.alert('Error', 'Invalid Ethereum address format');
      return;
    }

    // Check for duplicates
    const normalizedAddress = trimmedAddress.toLowerCase();
    if (emergencyContacts.some(c => c.address.toLowerCase() === normalizedAddress)) {
      Alert.alert('Error', 'This address is already in your emergency contacts');
      return;
    }

    const newContact: EmergencyContact = {
      id: `${Date.now()}-${Math.random()}`,
      address: trimmedAddress as Address,
      label: trimmedLabel,
      addedAt: Date.now(),
    };

    setEmergencyContacts([...emergencyContacts, newContact]);
    setNewContactLabel('');
    setNewContactAddress('');
    setIsAddingContact(false);
  };

  // Remove emergency contact
  const handleRemoveContact = (contactId: string) => {
    const contact = emergencyContacts.find(c => c.id === contactId);
    if (!contact) return;

    Alert.alert(
      'Remove Contact',
      `Remove ${contact.label} from emergency contacts?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setEmergencyContacts(emergencyContacts.filter(c => c.id !== contactId));
          },
        },
      ]
    );
  };

  // Format time remaining for a dossier
  const formatTimeRemaining = (dossier: RecipientDossier): { text: string; color: string; isExpired: boolean } => {
    const lastCheckInMs = Number(dossier.lastCheckIn) * 1000;
    const intervalMs = Number(dossier.checkInInterval) * 1000;
    const now = Date.now();
    const timeSinceLastCheckIn = now - lastCheckInMs;
    const remainingMs = intervalMs - timeSinceLastCheckIn;

    if (remainingMs <= 0) {
      return { text: 'RELEASED', color: theme.colors.error, isExpired: true };
    }

    const days = Math.floor(remainingMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((remainingMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    let color = theme.colors.success;
    if (remainingMs < 60 * 60 * 1000) {
      // Less than 1 hour
      color = theme.colors.error;
    } else if (remainingMs < 24 * 60 * 60 * 1000) {
      // Less than 1 day
      color = theme.colors.warning;
    }

    if (days > 0) {
      return { text: `${days}d ${hours}h`, color, isExpired: false };
    }
    return { text: `${hours}h`, color, isExpired: false };
  };

  // Get dossier status
  const getDossierStatus = (dossier: RecipientDossier): 'active' | 'awaiting' | 'released' => {
    const timeInfo = formatTimeRemaining(dossier);
    const hasGuardians = dossier.guardians && dossier.guardians.length > 0;

    if (!timeInfo.isExpired) {
      return 'active';
    } else if (hasGuardians && !dossier.isThresholdMet) {
      return 'awaiting';
    } else {
      return 'released';
    }
  };

  // Format date
  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Truncate address
  const truncateAddress = (addr: Address): string => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 16 }]}
        refreshControl={
          <RefreshControl
            refreshing={isLoadingDossiers}
            onRefresh={loadRecipientDossiers}
            tintColor={theme.colors.primary}
          />
        }
      >
        {/* Screen Header */}
        <View style={styles.screenHeader}>
          <View style={styles.screenTitleRow}>
            <View style={styles.screenTitleLeft}>
              <Icon name="eye" size={32} color="#e53e3e" />
              <Text style={[styles.screenTitle, { color: theme.colors.text }]}>RECEIVE</Text>
            </View>
            <Image
              source={require('../assets/canary-icon.png')}
              style={styles.canaryIcon}
              resizeMode="contain"
            />
          </View>
          <Text style={[styles.screenSubtitle, { color: theme.colors.textSecondary }]}>
            Track dossiers shared with you
          </Text>
        </View>

        {/* Private Recipient Dossiers Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="user-check" size={20} color={theme.colors.text} />
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Private Recipient Dossiers
            </Text>
          </View>

          {isLoadingDossiers && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
                Loading recipient dossiers...
              </Text>
            </View>
          )}

          {!isLoadingDossiers && recipientDossiers.length === 0 && (
            <View style={[styles.emptyContainer, { backgroundColor: theme.colors.card }]}>
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                You are not a private recipient of any dossiers yet.
              </Text>
            </View>
          )}

          {!isLoadingDossiers && recipientDossiers.length > 0 && (
            <View>
              <Text style={[styles.sectionDescription, { color: theme.colors.textSecondary }]}>
                You are a private recipient for {recipientDossiers.length} dossier{recipientDossiers.length !== 1 ? 's' : ''}. Tap to view details.
              </Text>
              {recipientDossiers.map((dossier) => {
                const key = `${dossier.owner}-${dossier.id}`;
                const status = getDossierStatus(dossier);
                const timeInfo = formatTimeRemaining(dossier);

                return (
                  <TouchableOpacity
                    key={key}
                    style={[styles.dossierCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                  >
                    <View style={styles.dossierHeader}>
                      <View style={styles.dossierInfo}>
                        <Text style={[styles.dossierName, { color: theme.colors.text }]}>
                          {dossier.name}
                        </Text>
                        <Text style={[styles.dossierOwner, { color: theme.colors.textSecondary }]}>
                          Owner: {truncateAddress(dossier.owner)}
                        </Text>
                      </View>

                      <View style={[
                        styles.statusBadge,
                        status === 'active'
                          ? styles.statusActive
                          : status === 'awaiting'
                            ? styles.statusAwaiting
                            : styles.statusReleased
                      ]}>
                        <Text style={[
                          styles.statusText,
                          status === 'active'
                            ? styles.statusActiveText
                            : status === 'awaiting'
                              ? styles.statusAwaitingText
                              : styles.statusReleasedText
                        ]}>
                          {status === 'active' ? 'Active' : status === 'awaiting' ? 'Awaiting Confirmation' : 'Released'}
                        </Text>
                      </View>
                    </View>

                    {!timeInfo.isExpired && (
                      <View style={[styles.timeRow, { borderTopColor: theme.colors.border }]}>
                        <Icon name="clock" size={16} color={theme.colors.textSecondary} />
                        <Text style={[styles.timeText, { color: timeInfo.color }]}>
                          {timeInfo.text} remaining
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* Emergency Contacts Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeader}>
              <Icon name="users" size={20} color={theme.colors.text} />
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Emergency Contacts
              </Text>
            </View>
            {!isAddingContact && (
              <TouchableOpacity
                style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
                onPress={() => setIsAddingContact(true)}
              >
                <Icon name="plus" size={16} color="#FFFFFF" />
                <Text style={styles.addButtonText}>Add</Text>
              </TouchableOpacity>
            )}
          </View>

          {isAddingContact && (
            <View style={[styles.addContactForm, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <Text style={[styles.formLabel, { color: theme.colors.text }]}>Contact Label</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.colors.background, borderColor: theme.colors.border, color: theme.colors.text }]}
                value={newContactLabel}
                onChangeText={setNewContactLabel}
                placeholder="e.g., Alice, Bob, My Friend"
                placeholderTextColor={theme.colors.textSecondary}
              />

              <Text style={[styles.formLabel, { color: theme.colors.text }]}>Ethereum Address</Text>
              <TextInput
                style={[styles.input, styles.addressInput, { backgroundColor: theme.colors.background, borderColor: theme.colors.border, color: theme.colors.text }]}
                value={newContactAddress}
                onChangeText={setNewContactAddress}
                placeholder="0x..."
                placeholderTextColor={theme.colors.textSecondary}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Text style={[styles.inputHint, { color: theme.colors.textSecondary }]}>
                Enter the Ethereum address of your emergency contact
              </Text>

              <View style={styles.formButtons}>
                <TouchableOpacity
                  style={[styles.formButton, styles.saveButton]}
                  onPress={handleAddContact}
                >
                  <Text style={styles.saveButtonText}>Add Contact</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.formButton, styles.cancelButton, { borderColor: theme.colors.border }]}
                  onPress={() => {
                    setIsAddingContact(false);
                    setNewContactLabel('');
                    setNewContactAddress('');
                  }}
                >
                  <Text style={[styles.cancelButtonText, { color: theme.colors.text }]}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {!isAddingContact && emergencyContacts.length === 0 && (
            <View style={[styles.emptyContainer, { backgroundColor: theme.colors.card }]}>
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                No emergency contacts added yet. Tap "Add" to start.
              </Text>
            </View>
          )}

          {emergencyContacts.length > 0 && (
            <View style={styles.contactsList}>
              <Text style={[styles.contactsCount, { color: theme.colors.textSecondary }]}>
                {emergencyContacts.length} contact{emergencyContacts.length !== 1 ? 's' : ''}
              </Text>
              {emergencyContacts.map((contact) => (
                <TouchableOpacity
                  key={contact.id}
                  style={[styles.contactCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                >
                  <View style={styles.contactInfo}>
                    <View style={styles.contactHeader}>
                      <Text style={[styles.contactLabel, { color: theme.colors.text }]}>
                        {contact.label}
                      </Text>
                      <Icon name="external-link" size={16} color={theme.colors.textSecondary} />
                    </View>
                    <Text style={[styles.contactAddress, { color: theme.colors.textSecondary }]}>
                      {contact.address}
                    </Text>
                    <Text style={[styles.contactDate, { color: theme.colors.textSecondary }]}>
                      Added {formatDate(contact.addedAt)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleRemoveContact(contact.id)}
                  >
                    <Icon name="trash-2" size={18} color={theme.colors.error} />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Info Section */}
        <View style={[styles.infoBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Icon name="info" size={20} color={theme.colors.primary} />
          <View style={styles.infoContent}>
            <Text style={[styles.infoTitle, { color: theme.colors.text }]}>About Receive</Text>
            <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
              • <Text style={{ fontWeight: '600' }}>Private Recipient Dossiers:</Text> View dossiers where you've been added as a private recipient by the owner
            </Text>
            <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
              • <Text style={{ fontWeight: '600' }}>Emergency Contacts:</Text> Add trusted contacts for quick access to their dossiers in emergency situations
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
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
  section: {
    marginBottom: 24,
    paddingHorizontal: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  sectionDescription: {
    fontSize: 14,
    marginBottom: 16,
  },
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  emptyContainer: {
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  dossierCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  dossierHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  dossierInfo: {
    flex: 1,
    marginRight: 12,
  },
  dossierName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  dossierOwner: {
    fontSize: 12,
    fontFamily: 'monospace',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusActive: {
    backgroundColor: '#D1FAE5',
  },
  statusAwaiting: {
    backgroundColor: '#FEF3C7',
  },
  statusReleased: {
    backgroundColor: '#FEE2E2',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusActiveText: {
    color: '#059669',
  },
  statusAwaitingText: {
    color: '#D97706',
  },
  statusReleasedText: {
    color: '#DC2626',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  timeText: {
    fontSize: 14,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  addContactForm: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
  },
  addressInput: {
    fontFamily: 'monospace',
  },
  inputHint: {
    fontSize: 12,
    marginTop: 4,
    marginBottom: 8,
  },
  formButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  formButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: '#10B981',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  cancelButton: {
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  contactsList: {
    marginTop: 8,
  },
  contactsCount: {
    fontSize: 14,
    marginBottom: 12,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  contactInfo: {
    flex: 1,
  },
  contactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  contactLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  contactAddress: {
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  contactDate: {
    fontSize: 11,
  },
  deleteButton: {
    padding: 8,
    marginLeft: 12,
  },
  infoBox: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginHorizontal: 24,
    marginBottom: 24,
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 4,
  },
});
