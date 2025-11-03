import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useDossier } from '../contexts/DossierContext';
import { useWallet } from '../contexts/WalletContext';
import { useTheme } from '../contexts/ThemeContext';
import type { Dossier } from '../types/dossier';

export const DossiersScreen = () => {
  const navigation = useNavigation();
  const { address } = useWallet();
  const { dossiers, isLoading, refreshDossiers } = useDossier();
  const { theme } = useTheme();

  const formatAddress = (addr: string) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  const renderDossierItem = ({ item }: { item: Dossier }) => (
    <TouchableOpacity style={[styles.dossierCard, { backgroundColor: theme.colors.card }]}>
      <View style={styles.cardHeader}>
        <Text style={[styles.dossierTitle, { color: theme.colors.text }]}>Dossier #{item.id.toString()}</Text>
        <View style={[
          styles.statusBadge,
          item.isActive ? styles.statusActive : styles.statusInactive
        ]}>
          <Text style={styles.statusText}>
            {item.isActive ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </View>

      <View style={styles.cardContent}>
        <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Owner</Text>
        <Text style={[styles.value, { color: theme.colors.text }]}>{formatAddress(item.owner)}</Text>

        <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Created</Text>
        <Text style={[styles.value, { color: theme.colors.text }]}>{formatDate(item.createdAt)}</Text>

        <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Last Check-in</Text>
        <Text style={[styles.value, { color: theme.colors.text }]}>
          {item.lastCheckIn ? formatDate(item.lastCheckIn) : 'Never'}
        </Text>

        <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Check-in Frequency</Text>
        <Text style={[styles.value, { color: theme.colors.text }]}>
          Every {Math.floor(item.checkInFrequency / 86400)} days
        </Text>

        {item.metadata && (
          <>
            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Recipients</Text>
            <Text style={[styles.value, { color: theme.colors.text }]}>
              {item.metadata.recipients?.length || 0} configured
            </Text>
          </>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>No Dossiers</Text>
      <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
        Create your first dossier to get started
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>My Dossiers</Text>
        {address && (
          <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>{formatAddress(address)}</Text>
        )}
      </View>

      <FlatList
        data={dossiers}
        renderItem={renderDossierItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refreshDossiers}
            tintColor={theme.colors.primary}
          />
        }
      />

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={() => navigation.navigate('CreateDossier' as never)}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  listContent: {
    padding: 16,
  },
  dossierCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dossierTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusActive: {
    backgroundColor: '#D1FAE5',
  },
  statusInactive: {
    backgroundColor: '#FEE2E2',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardContent: {
    gap: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 8,
  },
  value: {
    fontSize: 14,
    color: '#111827',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E53935',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabText: {
    fontSize: 32,
    color: '#FFFFFF',
    fontWeight: '300',
  },
});
