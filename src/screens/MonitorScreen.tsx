/**
 * Monitor (RECEIVE) Screen
 *
 * Shows dossiers where the current user is a private recipient
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import { useWallet } from '../contexts/WalletContext';
import { useTheme } from '../contexts/ThemeContext';
import * as ContractService from '../lib/contract';
import type { RecipientDossier, Address, DossierReference } from '../types/dossier';

export const MonitorScreen = () => {
  const insets = useSafeAreaInsets();
  const { address } = useWallet();
  const { theme } = useTheme();

  // State
  const [recipientDossiers, setRecipientDossiers] = useState<RecipientDossier[]>([]);
  const [isLoadingDossiers, setIsLoadingDossiers] = useState(true);

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


        {/* Info Section */}
        <View style={[styles.infoBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Icon name="info" size={20} color={theme.colors.primary} />
          <View style={styles.infoContent}>
            <Text style={[styles.infoTitle, { color: theme.colors.text }]}>About Receive</Text>
            <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
              View dossiers where you've been added as a private recipient by the owner. You can monitor these dossiers and access them when released.
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
