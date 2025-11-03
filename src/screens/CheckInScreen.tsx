/**
 * Check-In Screen (Dashboard)
 *
 * Main screen showing user's dossiers with check-in functionality
 */

import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useWallet } from '../contexts/WalletContext';
import { useDossier } from '../contexts/DossierContext';
import type { Dossier } from '../types/dossier';

export const CheckInScreen: React.FC = () => {
  const { address, isConnected, connectBurnerWallet } = useWallet();
  const { dossiers, isLoading, loadDossiers, checkIn, checkInAll } = useDossier();

  useEffect(() => {
    // Auto-connect burner wallet on mount if not connected
    if (!isConnected) {
      connectBurnerWallet().catch((err) => {
        console.error('Failed to auto-connect:', err);
      });
    }
  }, [isConnected]);

  /**
   * Handle check-in to a specific dossier
   */
  const handleCheckIn = async (dossierId: bigint) => {
    const result = await checkIn(dossierId);
    if (result.success) {
      console.log('✅ Check-in successful');
    } else {
      console.error('❌ Check-in failed:', result.error);
    }
  };

  /**
   * Handle check-in to all dossiers
   */
  const handleCheckInAll = async () => {
    const result = await checkInAll();
    if (result.success) {
      console.log('✅ Check-in all successful');
    } else {
      console.error('❌ Check-in all failed:', result.error);
    }
  };

  /**
   * Render empty state
   */
  const renderEmptyState = () => {
    if (isLoading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color="#E53935" />
          <Text style={styles.emptyText}>Loading dossiers...</Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>No Dossiers</Text>
        <Text style={styles.emptyText}>Create your first dossier to get started</Text>
      </View>
    );
  };

  /**
   * Render dossier item
   */
  const renderDossierItem = ({ item }: { item: Dossier }) => {
    const now = Math.floor(Date.now() / 1000);
    const lastCheckIn = Number(item.lastCheckIn);
    const interval = Number(item.checkInInterval);
    const nextCheckInDue = lastCheckIn + interval;
    const timeUntilDue = nextCheckInDue - now;
    const isOverdue = timeUntilDue < 0;

    // Format time
    const formatTime = (seconds: number) => {
      const abs = Math.abs(seconds);
      if (abs < 60) return `${abs}s`;
      if (abs < 3600) return `${Math.floor(abs / 60)}m`;
      if (abs < 86400) return `${Math.floor(abs / 3600)}h`;
      return `${Math.floor(abs / 86400)}d`;
    };

    return (
      <View style={styles.dossierCard}>
        <View style={styles.dossierHeader}>
          <Text style={styles.dossierName}>{item.name}</Text>
          <View
            style={[
              styles.statusBadge,
              !item.isActive && styles.statusBadgePaused,
              isOverdue && styles.statusBadgeOverdue,
            ]}>
            <Text style={styles.statusText}>
              {!item.isActive ? 'PAUSED' : isOverdue ? 'OVERDUE' : 'ACTIVE'}
            </Text>
          </View>
        </View>

        {item.description && (
          <Text style={styles.dossierDescription} numberOfLines={2}>
            {item.description}
          </Text>
        )}

        <View style={styles.dossierInfo}>
          <Text style={styles.infoLabel}>Files:</Text>
          <Text style={styles.infoValue}>{item.encryptedFileHashes.length}</Text>
        </View>

        <View style={styles.dossierInfo}>
          <Text style={styles.infoLabel}>Recipients:</Text>
          <Text style={styles.infoValue}>{item.recipients.length}</Text>
        </View>

        <View style={styles.dossierInfo}>
          <Text style={styles.infoLabel}>Check-in interval:</Text>
          <Text style={styles.infoValue}>{formatTime(interval)}</Text>
        </View>

        <View style={styles.dossierInfo}>
          <Text style={styles.infoLabel}>
            {isOverdue ? 'Overdue by:' : 'Next check-in in:'}
          </Text>
          <Text style={[styles.infoValue, isOverdue && styles.overdueText]}>
            {formatTime(timeUntilDue)}
          </Text>
        </View>

        {item.isActive && (
          <TouchableOpacity
            style={[styles.checkInButton, isOverdue && styles.checkInButtonUrgent]}
            onPress={() => handleCheckIn(item.id)}>
            <Text style={styles.checkInButtonText}>Check In</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // If not connected, show connection screen
  if (!isConnected) {
    return (
      <View style={styles.container}>
        <View style={styles.connectContainer}>
          <Text style={styles.connectTitle}>Canary</Text>
          <Text style={styles.connectSubtitle}>Connecting wallet...</Text>
          <ActivityIndicator size="large" color="#E53935" style={styles.connectLoader} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Dossiers</Text>
        <Text style={styles.headerAddress}>
          {address?.slice(0, 6)}...{address?.slice(-4)}
        </Text>
      </View>

      {/* Check-in all button */}
      {dossiers.length > 0 && (
        <TouchableOpacity style={styles.checkInAllButton} onPress={handleCheckInAll}>
          <Text style={styles.checkInAllButtonText}>Check In to All</Text>
        </TouchableOpacity>
      )}

      {/* Dossiers list */}
      <FlatList
        data={dossiers}
        renderItem={renderDossierItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={loadDossiers} colors={['#E53935']} />
        }
        ListEmptyComponent={renderEmptyState}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  connectContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  connectTitle: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#E53935',
    marginBottom: 8,
  },
  connectSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  connectLoader: {
    marginTop: 16,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    backgroundColor: '#FAFAFA',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 4,
  },
  headerAddress: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'monospace',
  },
  checkInAllButton: {
    backgroundColor: '#E53935',
    padding: 16,
    margin: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  checkInAllButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  dossierCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  dossierHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dossierName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212121',
    flex: 1,
  },
  statusBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusBadgePaused: {
    backgroundColor: '#FF9800',
  },
  statusBadgeOverdue: {
    backgroundColor: '#E53935',
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  dossierDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  dossierInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#212121',
  },
  overdueText: {
    color: '#E53935',
    fontWeight: '600',
  },
  checkInButton: {
    backgroundColor: '#E53935',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  checkInButtonUrgent: {
    backgroundColor: '#D32F2F',
  },
  checkInButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
