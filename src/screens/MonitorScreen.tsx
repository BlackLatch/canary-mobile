import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import { useDossier } from '../contexts/DossierContext';
import { useTheme } from '../contexts/ThemeContext';

export const MonitorScreen = () => {
  const { dossiers, isLoading, refreshDossiers } = useDossier();
  const { theme } = useTheme();
  const navigation = useNavigation();

  const activeDossiers = dossiers.filter(d => d.isActive);
  const inactiveDossiers = dossiers.filter(d => !d.isActive);

  // Calculate next check-in needed
  const getNextCheckInDays = () => {
    if (activeDossiers.length === 0) return null;

    const now = Math.floor(Date.now() / 1000);
    let minDays = Infinity;

    activeDossiers.forEach(dossier => {
      const lastCheckIn = Number(dossier.lastCheckIn || 0);
      const nextCheckIn = lastCheckIn + Number(dossier.checkInInterval);
      const daysRemaining = Math.ceil((nextCheckIn - now) / 86400);
      if (daysRemaining < minDays) {
        minDays = daysRemaining;
      }
    });

    return minDays === Infinity ? null : minDays;
  };

  const nextCheckInDays = getNextCheckInDays();

  // Show empty state if no dossiers
  if (dossiers.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.emptyStateContainer}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={refreshDossiers}
              tintColor={theme.colors.primary}
            />
          }
        >
          <View style={styles.emptyStateContent}>
            {/* Lock Icon */}
            <View style={[styles.iconCircle, { borderColor: theme.colors.border }]}>
              <Icon name="lock" size={48} color={theme.colors.textSecondary} />
            </View>

            {/* Title */}
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
              No Dossiers
            </Text>

            {/* Subtitle */}
            <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
              Create your first dossier to get started
            </Text>

            {/* Create Button */}
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => navigation.navigate('Create' as never)}
            >
              <Text style={styles.createButtonText}>CREATE DOSSIER</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: 16 }]}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refreshDossiers}
            tintColor={theme.colors.primary}
          />
        }
      >
        {/* Overview Stats */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Overview</Text>

          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: theme.colors.card }]}>
              <Text style={[styles.statValue, { color: theme.colors.text }]}>{dossiers.length}</Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Total Dossiers</Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: theme.colors.card }]}>
              <Text style={[styles.statValue, styles.statActive]}>
                {activeDossiers.length}
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Active</Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: theme.colors.card }]}>
              <Text style={[styles.statValue, styles.statInactive]}>
                {inactiveDossiers.length}
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Inactive</Text>
            </View>
          </View>
        </View>

        {/* Next Check-in Alert */}
        {nextCheckInDays !== null && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Next Check-in</Text>

            <View style={[
              styles.alertCard,
              { backgroundColor: theme.colors.card },
              nextCheckInDays <= 1 ? styles.alertUrgent :
              nextCheckInDays <= 3 ? styles.alertWarning :
              styles.alertNormal
            ]}>
              <Text style={[styles.alertValue, { color: theme.colors.text }]}>
                {nextCheckInDays <= 0 ? 'Overdue!' :
                 nextCheckInDays === 1 ? 'Tomorrow' :
                 `In ${nextCheckInDays} days`}
              </Text>
              <Text style={[styles.alertLabel, { color: theme.colors.textSecondary }]}>
                {nextCheckInDays <= 0
                  ? 'You have dossiers requiring immediate attention'
                  : 'Time until next required check-in'}
              </Text>
            </View>
          </View>
        )}

        {/* Activity Timeline */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Recent Activity</Text>

          {dossiers.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: theme.colors.card }]}>
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                No activity yet. Create a dossier to get started.
              </Text>
            </View>
          ) : (
            <View style={[styles.timelineContainer, { backgroundColor: theme.colors.card }]}>
              {dossiers.slice(0, 5).map((dossier, index) => (
                <View key={dossier.id.toString()} style={styles.timelineItem}>
                  <View style={[styles.timelineDot, { backgroundColor: theme.colors.primary }]} />
                  {index < Math.min(4, dossiers.length - 1) && (
                    <View style={[styles.timelineLine, { backgroundColor: theme.colors.border }]} />
                  )}
                  <View style={styles.timelineContent}>
                    <Text style={[styles.timelineTitle, { color: theme.colors.text }]}>
                      Dossier #{dossier.id.toString()}
                    </Text>
                    <Text style={[styles.timelineText, { color: theme.colors.textSecondary }]}>
                      {dossier.lastCheckIn
                        ? `Last checked in ${Math.floor((Date.now() / 1000 - dossier.lastCheckIn) / 86400)} days ago`
                        : 'No check-ins yet'}
                    </Text>
                    <Text style={[styles.timelineDate, { color: theme.colors.textSecondary }]}>
                      Created {new Date(dossier.createdAt * 1000).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Status Summary */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Status Summary</Text>

          <View style={[styles.summaryCard, { backgroundColor: theme.colors.card }]}>
            <View style={[styles.summaryRow, { borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>System Status</Text>
              <View style={styles.summaryBadge}>
                <View style={styles.statusDot} />
                <Text style={[styles.summaryValue, { color: theme.colors.text }]}>Operational</Text>
              </View>
            </View>

            <View style={[styles.summaryRow, { borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>Network</Text>
              <Text style={[styles.summaryValue, { color: theme.colors.text }]}>Status Testnet</Text>
            </View>

            <View style={[styles.summaryRow, { borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>Last Sync</Text>
              <Text style={[styles.summaryValue, { color: theme.colors.text }]}>Just now</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollContent: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  statActive: {
    color: '#10B981',
  },
  statInactive: {
    color: '#6B7280',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  alertCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  alertNormal: {
    borderLeftColor: '#10B981',
  },
  alertWarning: {
    borderLeftColor: '#F59E0B',
  },
  alertUrgent: {
    borderLeftColor: '#E53935',
  },
  alertValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  alertLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  timelineContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  timelineItem: {
    flexDirection: 'row',
    position: 'relative',
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#E53935',
    marginRight: 12,
    marginTop: 4,
  },
  timelineLine: {
    position: 'absolute',
    left: 6,
    top: 16,
    bottom: -16,
    width: 2,
    backgroundColor: '#E5E7EB',
  },
  timelineContent: {
    flex: 1,
    paddingBottom: 20,
  },
  timelineTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  timelineText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  timelineDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  summaryBadge: {
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
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  emptyStateContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyStateContent: {
    alignItems: 'center',
    maxWidth: 400,
    width: '100%',
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  emptyTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
  },
  createButton: {
    backgroundColor: '#E53935',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 12,
    shadowColor: '#E53935',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    minWidth: 280,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
});
