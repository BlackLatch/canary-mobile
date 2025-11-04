import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Clipboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import { useTheme } from '../contexts/ThemeContext';
import { useDossier } from '../contexts/DossierContext';
import type { Dossier } from '../types/dossier';

type DossierDetailRouteProp = {
  params: {
    dossier: Dossier;
  };
};

export const DossierDetailScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<DossierDetailRouteProp>();
  const { theme } = useTheme();
  const { checkIn, updateSchedule, pauseDossier, resumeDossier, releaseNow, permanentlyDisable } = useDossier();

  const [dossier, setDossier] = useState<Dossier>(route.params.dossier);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [showEditSchedule, setShowEditSchedule] = useState(false);
  const [showReleaseConfirm, setShowReleaseConfirm] = useState(false);
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [dialogMessage, setDialogMessage] = useState('');
  const [newInterval, setNewInterval] = useState('');
  const [customInterval, setCustomInterval] = useState('');

  const formatAddress = (addr: string) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const formatFullAddress = (addr: string) => {
    if (!addr) return '';
    return addr;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const formatInterval = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const days = Math.floor(hours / 24);

    if (days >= 365) {
      const years = Math.floor(days / 365);
      return `${years} year${years > 1 ? 's' : ''}`;
    }
    if (days >= 30) {
      const months = Math.floor(days / 30);
      return `${months} month${months > 1 ? 's' : ''}`;
    }
    if (days >= 1) {
      return `${days} day${days > 1 ? 's' : ''}`;
    }
    if (hours >= 1) {
      const mins = Math.floor((seconds % 3600) / 60);
      return mins > 0 ? `${hours}h ${mins}m` : `${hours} hour${hours > 1 ? 's' : ''}`;
    }
    const mins = Math.floor(seconds / 60);
    return `${mins} minute${mins > 1 ? 's' : ''}`;
  };

  const getStatusInfo = () => {
    if (dossier.isPermanentlyDisabled) {
      return { text: 'Permanently Disabled', color: '#EF4444', bgColor: '#FEE2E2' };
    }
    if (dossier.isReleased) {
      return { text: 'Released', color: '#10B981', bgColor: '#D1FAE5' };
    }
    if (!dossier.isActive) {
      return { text: 'Paused', color: '#6B7280', bgColor: '#F3F4F6' };
    }

    // Check if expired
    const now = Math.floor(Date.now() / 1000);
    const timeSinceLastCheckIn = now - (dossier.lastCheckIn || dossier.createdAt);
    if (timeSinceLastCheckIn > dossier.checkInFrequency) {
      return { text: 'Expired', color: '#F59E0B', bgColor: '#FEF3C7' };
    }

    return { text: 'Active', color: '#10B981', bgColor: '#D1FAE5' };
  };

  const showSuccess = (message: string) => {
    setDialogMessage(message);
    setShowSuccessDialog(true);
  };

  const showError = (message: string) => {
    setDialogMessage(message);
    setShowErrorDialog(true);
  };

  const handleCheckIn = async () => {
    setIsCheckingIn(true);
    try {
      const result = await checkIn(dossier.id);
      if (result.success) {
        // Update local state
        setDossier({ ...dossier, lastCheckIn: Math.floor(Date.now() / 1000) });
        showSuccess('Check-in completed successfully');
      } else {
        showError(result.error || 'Failed to check in');
      }
    } catch (error) {
      showError('An unexpected error occurred');
    } finally {
      setIsCheckingIn(false);
    }
  };

  const handlePauseResume = async () => {
    try {
      const result = dossier.isActive
        ? await pauseDossier(dossier.id)
        : await resumeDossier(dossier.id);

      if (result.success) {
        setDossier({ ...dossier, isActive: !dossier.isActive });
        showSuccess(dossier.isActive ? 'Dossier paused' : 'Dossier resumed');
      } else {
        showError(result.error || 'Failed to update dossier');
      }
    } catch (error) {
      showError('An unexpected error occurred');
    }
  };

  const handleUpdateSchedule = async () => {
    const intervalMinutes = newInterval === 'custom'
      ? parseInt(customInterval) * 60
      : parseInt(newInterval);

    if (isNaN(intervalMinutes) || intervalMinutes <= 0) {
      showError('Please enter a valid interval');
      return;
    }

    const intervalSeconds = intervalMinutes * 60;

    try {
      const result = await updateSchedule(dossier.id, intervalSeconds);
      if (result.success) {
        setDossier({ ...dossier, checkInFrequency: intervalSeconds });
        setShowEditSchedule(false);
        showSuccess('Check-in schedule updated');
      } else {
        showError(result.error || 'Failed to update schedule');
      }
    } catch (error) {
      showError('An unexpected error occurred');
    }
  };

  const handleRelease = async () => {
    try {
      const result = await releaseNow(dossier.id);
      if (result.success) {
        setDossier({ ...dossier, isReleased: true });
        setShowReleaseConfirm(false);
        showSuccess('Dossier has been released');
      } else {
        showError(result.error || 'Failed to release dossier');
      }
    } catch (error) {
      showError('An unexpected error occurred');
    }
  };

  const handleDisable = async () => {
    try {
      const result = await permanentlyDisable(dossier.id);
      if (result.success) {
        setDossier({ ...dossier, isPermanentlyDisabled: true });
        setShowDisableConfirm(false);
        showSuccess('Dossier has been permanently disabled');
      } else {
        showError(result.error || 'Failed to disable dossier');
      }
    } catch (error) {
      showError('An unexpected error occurred');
    }
  };

  const handleDecrypt = async () => {
    showError('Decryption functionality will be available in a future update');
  };

  const copyToClipboard = (text: string, label: string) => {
    Clipboard.setString(text);
    showSuccess(`${label} copied to clipboard`);
  };

  const statusInfo = getStatusInfo();
  const canCheckIn = dossier.isActive && !dossier.isReleased && !dossier.isPermanentlyDisabled;
  const canModify = !dossier.isReleased && !dossier.isPermanentlyDisabled;
  const canDecrypt = dossier.isReleased || (dossier.metadata?.encryptedFiles?.length || 0) > 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color={theme.colors.text} />
          <Text style={[styles.backText, { color: theme.colors.text }]}>Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Dossier Overview */}
        <View style={[styles.panel, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <View style={styles.panelHeader}>
            <Text style={[styles.dossierName, { color: theme.colors.text }]}>
              {dossier.metadata?.name || `Dossier #${dossier.id}`}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: statusInfo.bgColor }]}>
              <View style={[styles.statusDot, { backgroundColor: statusInfo.color }]} />
              <Text style={[styles.statusText, { color: statusInfo.color }]}>{statusInfo.text}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Dossier ID</Text>
            <Text style={[styles.value, { color: theme.colors.text }]}>#{dossier.id.toString()}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Visibility</Text>
            <View style={styles.visibilityBadge}>
              <Icon
                name={dossier.metadata?.recipients?.length ? 'lock' : 'globe'}
                size={14}
                color={theme.colors.text}
              />
              <Text style={[styles.visibilityText, { color: theme.colors.text }]}>
                {dossier.metadata?.recipients?.length ? 'Private' : 'Public'}
              </Text>
            </View>
          </View>

          {dossier.metadata?.description && (
            <View style={[styles.infoRow, styles.descriptionRow]}>
              <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Description</Text>
              <Text style={[styles.description, { color: theme.colors.text }]}>
                {dossier.metadata.description}
              </Text>
            </View>
          )}
        </View>

        {/* Timing & Schedule */}
        <View style={[styles.panel, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <Text style={[styles.panelTitle, { color: theme.colors.text }]}>Timing & Schedule</Text>

          <View style={styles.timingGrid}>
            <View style={styles.timingItem}>
              <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Check-in Interval</Text>
              <Text style={[styles.value, { color: theme.colors.text }]}>
                {formatInterval(dossier.checkInFrequency)}
              </Text>
            </View>

            <View style={styles.timingItem}>
              <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Last Check-In</Text>
              <Text style={[styles.value, { color: theme.colors.text }]}>
                {dossier.lastCheckIn ? formatDate(dossier.lastCheckIn) : 'Never'}
              </Text>
            </View>
          </View>

          {canModify && dossier.isActive && (
            <TouchableOpacity
              style={[styles.secondaryButton, { borderColor: theme.colors.border }]}
              onPress={() => setShowEditSchedule(true)}
            >
              <Text style={[styles.secondaryButtonText, { color: theme.colors.text }]}>Edit Schedule</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Encrypted Files */}
        {dossier.metadata?.encryptedFiles && dossier.metadata.encryptedFiles.length > 0 && (
          <View style={[styles.panel, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.panelTitle, { color: theme.colors.text }]}>Encrypted Files</Text>

            {dossier.metadata.encryptedFiles.map((file, index) => (
              <View key={index} style={[styles.fileItem, { borderTopColor: theme.colors.border }]}>
                <Text style={[styles.fileNumber, { color: theme.colors.text }]}>File #{index + 1}</Text>
                <Text style={[styles.fileHash, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                  {file.ipfsHash || file.cid || 'No hash available'}
                </Text>
                <TouchableOpacity
                  style={[styles.copyButton, { borderColor: theme.colors.border }]}
                  onPress={() => copyToClipboard(file.ipfsHash || file.cid || '', 'File hash')}
                >
                  <Icon name="copy" size={14} color={theme.colors.text} />
                  <Text style={[styles.copyButtonText, { color: theme.colors.text }]}>Copy</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Recipients */}
        {dossier.metadata?.recipients && dossier.metadata.recipients.length > 0 && (
          <View style={[styles.panel, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.panelTitle, { color: theme.colors.text }]}>Recipients</Text>

            {dossier.metadata.recipients.map((recipient, index) => (
              <View key={index} style={[styles.recipientItem, { borderTopColor: theme.colors.border }]}>
                <Text style={[styles.recipientNumber, { color: theme.colors.text }]}>Recipient #{index + 1}</Text>
                <Text style={[styles.recipientAddress, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                  {recipient}
                </Text>
                <TouchableOpacity
                  style={[styles.copyButton, { borderColor: theme.colors.border }]}
                  onPress={() => copyToClipboard(recipient, 'Recipient address')}
                >
                  <Icon name="copy" size={14} color={theme.colors.text} />
                  <Text style={[styles.copyButtonText, { color: theme.colors.text }]}>Copy</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Actions */}
        <View style={[styles.panel, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <Text style={[styles.panelTitle, { color: theme.colors.text }]}>Actions</Text>

          {canCheckIn && (
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: theme.colors.text }]}
              onPress={handleCheckIn}
              disabled={isCheckingIn}
            >
              {isCheckingIn ? (
                <ActivityIndicator color={theme.colors.background} />
              ) : (
                <Text style={[styles.primaryButtonText, { color: theme.colors.background }]}>
                  Check In
                </Text>
              )}
            </TouchableOpacity>
          )}

          {canDecrypt && (
            <TouchableOpacity
              style={[styles.secondaryButton, { borderColor: theme.colors.border }]}
              onPress={handleDecrypt}
            >
              <Icon name="download" size={16} color={theme.colors.text} />
              <Text style={[styles.secondaryButtonText, { color: theme.colors.text }]}>
                Download & Decrypt
              </Text>
            </TouchableOpacity>
          )}

          {canModify && (
            <TouchableOpacity
              style={[styles.secondaryButton, { borderColor: theme.colors.border }]}
              onPress={handlePauseResume}
            >
              <Icon name={dossier.isActive ? 'pause' : 'play'} size={16} color={theme.colors.text} />
              <Text style={[styles.secondaryButtonText, { color: theme.colors.text }]}>
                {dossier.isActive ? 'Pause Check-ins' : 'Resume Check-ins'}
              </Text>
            </TouchableOpacity>
          )}

          {canModify && (
            <TouchableOpacity
              style={[styles.secondaryButton, { borderColor: '#10B981', backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}
              onPress={() => setShowReleaseConfirm(true)}
            >
              <Icon name="unlock" size={16} color="#10B981" />
              <Text style={[styles.secondaryButtonText, { color: '#10B981' }]}>Release Now</Text>
            </TouchableOpacity>
          )}

          {canModify && (
            <TouchableOpacity
              style={[styles.secondaryButton, { borderColor: '#EF4444', backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}
              onPress={() => setShowDisableConfirm(true)}
            >
              <Icon name="trash-2" size={16} color="#EF4444" />
              <Text style={[styles.secondaryButtonText, { color: '#EF4444' }]}>Permanently Disable</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Edit Schedule Modal */}
      <Modal
        visible={showEditSchedule}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditSchedule(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Edit Check-in Schedule</Text>

            <View style={styles.intervalPresets}>
              {[
                { label: '1 Hour', value: '60' },
                { label: '1 Day', value: '1440' },
                { label: '1 Week', value: '10080' },
                { label: '1 Month', value: '43200' },
                { label: 'Custom', value: 'custom' },
              ].map((preset) => (
                <TouchableOpacity
                  key={preset.value}
                  style={[
                    styles.presetButton,
                    { borderColor: theme.colors.border },
                    newInterval === preset.value && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                  ]}
                  onPress={() => setNewInterval(preset.value)}
                >
                  <Text style={[
                    styles.presetButtonText,
                    { color: theme.colors.text },
                    newInterval === preset.value && { color: '#FFFFFF' }
                  ]}>
                    {preset.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {newInterval === 'custom' && (
              <TextInput
                style={[styles.input, { backgroundColor: theme.colors.background, color: theme.colors.text, borderColor: theme.colors.border }]}
                placeholder="Hours (1-8760)"
                placeholderTextColor={theme.colors.textSecondary}
                keyboardType="numeric"
                value={customInterval}
                onChangeText={setCustomInterval}
              />
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: theme.colors.border }]}
                onPress={() => setShowEditSchedule(false)}
              >
                <Text style={[styles.modalButtonText, { color: theme.colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: theme.colors.primary }]}
                onPress={handleUpdateSchedule}
              >
                <Text style={[styles.modalButtonText, { color: '#FFFFFF' }]}>Update</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Release Confirmation Modal */}
      <Modal
        visible={showReleaseConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowReleaseConfirm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
            <Icon name="alert-circle" size={48} color="#F59E0B" style={styles.modalIcon} />
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Release Dossier Now?</Text>
            <Text style={[styles.modalDescription, { color: theme.colors.textSecondary }]}>
              This is a permanent action that cannot be undone. Recipients will immediately be able to access and decrypt the data.
            </Text>

            <View style={styles.warningList}>
              <Text style={[styles.warningItem, { color: theme.colors.textSecondary }]}>• Data will be immediately accessible</Text>
              <Text style={[styles.warningItem, { color: theme.colors.textSecondary }]}>• Action is recorded on blockchain</Text>
              <Text style={[styles.warningItem, { color: theme.colors.textSecondary }]}>• Cannot be reversed or stopped</Text>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: theme.colors.border }]}
                onPress={() => setShowReleaseConfirm(false)}
              >
                <Text style={[styles.modalButtonText, { color: theme.colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: '#10B981' }]}
                onPress={handleRelease}
              >
                <Text style={[styles.modalButtonText, { color: '#FFFFFF' }]}>Release Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Disable Confirmation Modal */}
      <Modal
        visible={showDisableConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDisableConfirm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
            <Icon name="alert-circle" size={48} color="#EF4444" style={styles.modalIcon} />
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Permanently Disable?</Text>
            <Text style={[styles.modalDescription, { color: theme.colors.textSecondary }]}>
              This action will permanently disable the dossier. The encrypted data will remain encrypted forever and cannot be decrypted by anyone.
            </Text>

            <View style={styles.warningList}>
              <Text style={[styles.warningItem, { color: '#EF4444' }]}>• Data remains encrypted permanently</Text>
              <Text style={[styles.warningItem, { color: '#EF4444' }]}>• No one can decrypt the data</Text>
              <Text style={[styles.warningItem, { color: '#EF4444' }]}>• Cannot be reversed or released</Text>
              <Text style={[styles.warningItem, { color: '#EF4444' }]}>• Action recorded on blockchain</Text>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: theme.colors.border }]}
                onPress={() => setShowDisableConfirm(false)}
              >
                <Text style={[styles.modalButtonText, { color: theme.colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: '#EF4444' }]}
                onPress={handleDisable}
              >
                <Text style={[styles.modalButtonText, { color: '#FFFFFF' }]}>Permanently Disable</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Success Dialog Modal */}
      <Modal
        visible={showSuccessDialog}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSuccessDialog(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.alertDialogContent, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.alertDialogTitle, { color: theme.colors.text }]}>Success</Text>
            <Text style={[styles.alertDialogMessage, { color: theme.colors.textSecondary }]}>
              {dialogMessage}
            </Text>
            <TouchableOpacity
              style={[styles.alertDialogButton, { backgroundColor: theme.colors.text }]}
              onPress={() => setShowSuccessDialog(false)}
            >
              <Text style={[styles.alertDialogButtonText, { color: theme.colors.background }]}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Error Dialog Modal */}
      <Modal
        visible={showErrorDialog}
        transparent
        animationType="fade"
        onRequestClose={() => setShowErrorDialog(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.alertDialogContent, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.alertDialogTitle, { color: theme.colors.error }]}>Error</Text>
            <Text style={[styles.alertDialogMessage, { color: theme.colors.textSecondary }]}>
              {dialogMessage}
            </Text>
            <TouchableOpacity
              style={[styles.alertDialogButton, { backgroundColor: theme.colors.text }]}
              onPress={() => setShowErrorDialog(false)}
            >
              <Text style={[styles.alertDialogButtonText, { color: theme.colors.background }]}>OK</Text>
            </TouchableOpacity>
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
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    fontSize: 16,
    marginLeft: 8,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  panel: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  panelHeader: {
    marginBottom: 16,
  },
  dossierName: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  panelTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  infoRow: {
    marginBottom: 12,
  },
  descriptionRow: {
    marginTop: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  value: {
    fontSize: 14,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  visibilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  visibilityText: {
    fontSize: 14,
    marginLeft: 6,
  },
  timingGrid: {
    marginBottom: 16,
  },
  timingItem: {
    marginBottom: 12,
  },
  fileItem: {
    paddingTop: 12,
    marginTop: 12,
    borderTopWidth: 1,
  },
  fileNumber: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  fileHash: {
    fontSize: 12,
    fontFamily: 'Courier',
    marginBottom: 8,
  },
  recipientItem: {
    paddingTop: 12,
    marginTop: 12,
    borderTopWidth: 1,
  },
  recipientNumber: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  recipientAddress: {
    fontSize: 12,
    fontFamily: 'Courier',
    marginBottom: 8,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  copyButtonText: {
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '600',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    marginBottom: 12,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 12,
    padding: 24,
  },
  modalIcon: {
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
    textAlign: 'center',
  },
  warningList: {
    marginBottom: 24,
  },
  warningItem: {
    fontSize: 14,
    marginBottom: 8,
  },
  intervalPresets: {
    marginBottom: 16,
  },
  presetButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
    alignItems: 'center',
  },
  presetButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16,
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
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  alertDialogContent: {
    width: '90%',
    maxWidth: 340,
    borderWidth: 1,
  },
  alertDialogTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  alertDialogMessage: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 24,
  },
  alertDialogButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  alertDialogButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
