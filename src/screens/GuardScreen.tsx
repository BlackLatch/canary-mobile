/**
 * Guard Screen
 *
 * Shows dossiers where the current user is a guardian
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Alert,
  Image,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import { useDossier } from '../contexts/DossierContext';
import { useTheme } from '../contexts/ThemeContext';
import { EmptyState } from '../components/EmptyState';
import type { GuardianDossier } from '../types/dossier';
import { serializeGuardianDossier } from '../types/dossier';

export const GuardScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { guardianDossiers, guardianDossiersLoading, loadGuardianDossiers, confirmRelease } = useDossier();
  const { theme } = useTheme();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedDossier, setSelectedDossier] = useState<GuardianDossier | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Update time every second for countdown
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getTimeInfo = (dossier: GuardianDossier) => {
    const now = Math.floor(Date.now() / 1000);
    const lastCheckIn = Number(dossier.lastCheckIn);
    const interval = Number(dossier.checkInInterval);
    const expiresAt = lastCheckIn + interval;
    const remaining = expiresAt - now;
    const isExpired = remaining <= 0;

    if (isExpired) {
      return {
        display: 'EXPIRED',
        color: theme.colors.error,
        isExpired: true,
      };
    }

    const days = Math.floor(remaining / 86400);
    const hours = Math.floor((remaining % 86400) / 3600);
    const minutes = Math.floor((remaining % 3600) / 60);

    let color = theme.colors.success;
    if (remaining < 86400) {  // <1 day
      color = theme.colors.warning;
    }

    let display = '';
    if (days > 0) {
      display = `${days}d ${hours}h`;
    } else if (hours > 0) {
      display = `${hours}h ${minutes}m`;
    } else {
      display = `${minutes}m`;
    }

    return { display, color, isExpired: false };
  };

  const getStatus = (dossier: GuardianDossier) => {
    const timeInfo = getTimeInfo(dossier);
    const hasGuardians = dossier.guardians && dossier.guardians.length > 0;

    if (!timeInfo.isExpired) {
      return { label: 'Active', color: '#B8E994' };
    } else if (hasGuardians && !dossier.isThresholdMet) {
      return { label: 'Awaiting Confirmation', color: '#FFB800' };
    } else {
      return { label: 'Released', color: '#FF6B6B' };
    }
  };

  const abbreviateAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const handleViewDossier = (dossier: GuardianDossier) => {
    navigation.navigate('DossierDetail' as never, { dossier: serializeGuardianDossier(dossier) } as never);
  };

  const handleConfirmPress = (dossier: GuardianDossier) => {
    setSelectedDossier(dossier);
    setShowConfirmModal(true);
  };

  const handleConfirmRelease = async () => {
    if (!selectedDossier) return;

    setShowConfirmModal(false);

    const result = await confirmRelease(selectedDossier.owner, selectedDossier.id);

    if (result.success) {
      Alert.alert('Success', 'Release confirmed successfully');
      await loadGuardianDossiers();
    } else {
      Alert.alert('Error', result.error || 'Failed to confirm release');
    }

    setSelectedDossier(null);
  };

  const renderDossierCard = (dossier: GuardianDossier) => {
    const timeInfo = getTimeInfo(dossier);
    const status = getStatus(dossier);
    const displayName = dossier.name || `Dossier #${dossier.id.toString()}`;
    const canConfirm = timeInfo.isExpired && !dossier.hasCurrentUserConfirmed && !dossier.isDecryptable;
    const confirmationCount = Number(dossier.guardianConfirmationCount || 0);
    const guardianTotal = dossier.guardians?.length || 0;

    return (
      <View
        key={`${dossier.owner}-${dossier.id.toString()}`}
        style={[styles.dossierCard, {
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.border
        }]}
      >
        {/* Header */}
        <View style={[styles.cardHeader, { borderBottomColor: theme.colors.border }]}>
          <View style={styles.headerLeft}>
            <Text
              style={[styles.dossierName, { color: theme.colors.text }]}
              numberOfLines={1}
            >
              {displayName}
            </Text>
            <Text style={[styles.ownerAddress, { color: theme.colors.textSecondary }]}>
              Owner: {abbreviateAddress(dossier.owner)}
            </Text>
          </View>
          <View style={styles.statusBadge}>
            <View style={[
              styles.statusDot,
              {
                backgroundColor: status.color,
                shadowColor: status.color,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.2,
                shadowRadius: 4,
                elevation: 2,
              }
            ]} />
            <Text style={[
              styles.statusText,
              { color: theme.colors.text }
            ]}>
              {status.label}
            </Text>
          </View>
        </View>

        {/* Body */}
        <View style={styles.cardBody}>
          {/* Guardian Info */}
          <View style={styles.guardianInfo}>
            <View style={[
              styles.confirmationBadge,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border
              }
            ]}>
              <Icon
                name={dossier.hasCurrentUserConfirmed ? "check-circle" : "clock"}
                size={14}
                color={dossier.hasCurrentUserConfirmed ? theme.colors.success : theme.colors.textSecondary}
              />
              <Text style={[
                styles.confirmationText,
                { color: theme.colors.textSecondary }
              ]}>
                {dossier.hasCurrentUserConfirmed ? 'Confirmed' : 'Not Confirmed'}
              </Text>
            </View>
            <Text style={[styles.progressText, { color: theme.colors.text }]}>
              {confirmationCount}/{guardianTotal} Guardians
            </Text>
          </View>

          {/* Time Remaining */}
          {!timeInfo.isExpired && (
            <View style={styles.timeContainer}>
              <Text style={[styles.timeLabel, { color: theme.colors.textSecondary }]}>
                Time Remaining
              </Text>
              <Text
                style={[styles.timeDisplay, { color: timeInfo.color }]}
              >
                {timeInfo.display}
              </Text>
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={[styles.cardFooter, { borderTopColor: theme.colors.border }]}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              { backgroundColor: theme.colors.background, borderColor: theme.colors.border }
            ]}
            onPress={() => handleViewDossier(dossier)}
          >
            <Text style={[styles.actionButtonText, { color: theme.colors.text }]}>
              VIEW MORE
            </Text>
          </TouchableOpacity>

          {canConfirm && (
            <TouchableOpacity
              style={[styles.actionButton, styles.confirmButton]}
              onPress={() => handleConfirmPress(dossier)}
            >
              <Icon name="shield" size={16} color="#FFFFFF" />
              <Text style={[styles.actionButtonText, styles.confirmButtonText]}>
                CONFIRM RELEASE
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Icon name="shield" size={64} color={theme.colors.textSecondary} />
      <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
        No Guardian Dossiers
      </Text>
      <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
        You are not currently a guardian for any dossiers
      </Text>
    </View>
  );

  const renderInfoBox = () => (
    <View style={[styles.infoBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <View style={styles.infoHeader}>
        <Icon name="info" size={16} color={theme.colors.primary} />
        <Text style={[styles.infoTitle, { color: theme.colors.text }]}>
          Guardian Protection
        </Text>
      </View>
      <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
        As a guardian, you help protect dossiers by requiring multi-party approval before release.
        Only confirm releases when you verify the circumstances are appropriate.
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 16 }]}
        refreshControl={
          <RefreshControl
            refreshing={guardianDossiersLoading}
            onRefresh={loadGuardianDossiers}
            tintColor={theme.colors.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <View style={styles.headerTitleLeft}>
              <Icon name="shield" size={32} color="#e53e3e" />
              <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
                GUARDIAN DOSSIERS
              </Text>
            </View>
            <Image
              source={require('../assets/canary-icon.png')}
              style={styles.canaryIcon}
              resizeMode="contain"
            />
          </View>
          <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
            View and manage dossiers where you are a guardian
          </Text>
        </View>

        {!guardianDossiers || guardianDossiers.length === 0 ? (
          renderEmptyState()
        ) : (
          <>
            {/* Count Label */}
            <View style={styles.countContainer}>
              <Text style={[styles.countLabel, { color: theme.colors.textSecondary }]}>
                {guardianDossiers.length} GUARDIAN DOSSIER{guardianDossiers.length !== 1 ? 'S' : ''}
              </Text>
            </View>

            {/* Dossiers List */}
            <View style={styles.list}>
              {guardianDossiers.map(renderDossierCard)}
            </View>

            {/* Info Box */}
            {renderInfoBox()}
          </>
        )}
      </ScrollView>

      {/* Guardian Confirm Modal */}
      {showConfirmModal && selectedDossier && (
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Icon name="shield" size={48} color={theme.colors.error} />
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                CONFIRM GUARDIAN RELEASE
              </Text>
            </View>

            {/* Modal Body */}
            <View style={styles.modalBody}>
              <Text style={[styles.modalWarning, { color: theme.colors.text }]}>
                You are about to confirm the release of this dossier as a guardian.
              </Text>

              <View style={[styles.dossierNameBox, { backgroundColor: theme.colors.surface }]}>
                <Text style={[styles.dossierNameLabel, { color: theme.colors.textSecondary }]}>
                  Dossier:
                </Text>
                <Text style={[styles.dossierNameValue, { color: theme.colors.text }]}>
                  {selectedDossier.name || `Dossier #${selectedDossier.id.toString()}`}
                </Text>
              </View>

              <View style={styles.bulletPoints}>
                <Text style={[styles.bulletPoint, { color: theme.colors.textSecondary }]}>
                  • Your confirmation will be recorded on the blockchain
                </Text>
                <Text style={[styles.bulletPoint, { color: theme.colors.textSecondary }]}>
                  • Once the guardian threshold is met, the dossier will be released
                </Text>
                <Text style={[styles.bulletPoint, { color: theme.colors.textSecondary }]}>
                  • This action cannot be undone
                </Text>
              </View>

              <View style={[styles.importantBox, { backgroundColor: theme.colors.surface }]}>
                <Text style={[styles.importantText, { color: theme.colors.warning }]}>
                  Important: Only confirm if you have verified that the circumstances warrant this release.
                </Text>
              </View>
            </View>

            {/* Modal Footer */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: theme.colors.surface }]}
                onPress={() => setShowConfirmModal(false)}
              >
                <Text style={[styles.modalButtonText, { color: theme.colors.text }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmModalButton, { backgroundColor: theme.colors.text }]}
                onPress={handleConfirmRelease}
              >
                <Icon name="shield" size={16} color={theme.colors.background} />
                <Text style={[styles.modalButtonText, { color: theme.colors.background }]}>
                  Confirm Release
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerTitleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  headerSubtitle: {
    fontSize: 14,
    marginLeft: 36,
  },
  canaryIcon: {
    width: 32,
    height: 32,
  },
  countContainer: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  countLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
  },
  list: {
    paddingHorizontal: 24,
    gap: 16,
  },
  dossierCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flex: 1,
    marginRight: 12,
  },
  dossierName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  ownerAddress: {
    fontSize: 12,
    fontFamily: 'monospace',
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
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  cardBody: {
    padding: 16,
  },
  guardianInfo: {
    alignItems: 'center',
    marginBottom: 16,
  },
  confirmationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    marginBottom: 8,
  },
  confirmationText: {
    fontSize: 12,
    fontWeight: '500',
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
  },
  timeContainer: {
    alignItems: 'center',
  },
  timeLabel: {
    fontSize: 12,
    marginBottom: 8,
  },
  timeDisplay: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  cardFooter: {
    borderTopWidth: 1,
    padding: 16,
    gap: 12,
  },
  actionButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  confirmButton: {
    backgroundColor: '#10B981',
    borderWidth: 0,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1.2,
  },
  confirmButtonText: {
    color: '#FFFFFF',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 48,
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 24,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  infoBox: {
    marginHorizontal: 24,
    marginTop: 24,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  infoText: {
    fontSize: 12,
    lineHeight: 18,
  },
  // Modal Styles
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    borderRadius: 12,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    alignItems: 'center',
    padding: 24,
    paddingBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginTop: 12,
    textAlign: 'center',
  },
  modalBody: {
    padding: 24,
    paddingTop: 8,
  },
  modalWarning: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  dossierNameBox: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  dossierNameLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  dossierNameValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  bulletPoints: {
    marginBottom: 16,
    gap: 8,
  },
  bulletPoint: {
    fontSize: 12,
    lineHeight: 18,
  },
  importantBox: {
    padding: 12,
    borderRadius: 8,
  },
  importantText: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '500',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 24,
    paddingTop: 8,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  confirmModalButton: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
