/**
 * Check-In Screen (System Status Dashboard)
 *
 * System-level check-in view matching reference implementation
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Share,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWallet } from '../contexts/WalletContext';
import { useDossier } from '../contexts/DossierContext';
import { useTheme } from '../contexts/ThemeContext';

export const CheckInScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { address, isConnected, connectBurnerWallet } = useWallet();
  const { dossiers, isLoading, loadDossiers, checkInAll } = useDossier();
  const { theme } = useTheme();
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [systemEnabled, setSystemEnabled] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    // Auto-connect burner wallet on mount if not connected
    if (!isConnected) {
      connectBurnerWallet().catch((err) => {
        console.error('Failed to auto-connect:', err);
      });
    }
  }, [isConnected]);

  // Update time every second for countdown
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  /**
   * Get countdown time until next check-in required
   */
  const getCountdownTime = () => {
    if (!dossiers.length) {
      return { display: '--:--:--', color: 'text-gray-500', isExpired: false };
    }

    const activeDossiers = dossiers.filter((d) => d.isActive);
    if (activeDossiers.length === 0) {
      return { display: 'NO ACTIVE', color: 'text-gray-500', isExpired: false };
    }

    // Find the dossier that will expire soonest
    const now = Math.floor(Date.now() / 1000);
    let shortestTime = Infinity;

    for (const dossier of activeDossiers) {
      const lastCheckIn = Number(dossier.lastCheckIn);
      const interval = Number(dossier.checkInInterval);
      const nextCheckInDue = lastCheckIn + interval;
      const timeUntilDue = nextCheckInDue - now;

      if (timeUntilDue < shortestTime) {
        shortestTime = timeUntilDue;
      }
    }

    if (shortestTime < 0) {
      return { display: 'EXPIRED', color: 'text-red-500', isExpired: true };
    }

    // Format as HH:MM:SS
    const hours = Math.floor(shortestTime / 3600);
    const minutes = Math.floor((shortestTime % 3600) / 60);
    const seconds = shortestTime % 60;
    const formatted = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    return {
      display: formatted,
      color: shortestTime < 3600 ? 'text-orange-500' : 'text-green-500',
      isExpired: false
    };
  };

  /**
   * Get time since last check-in
   */
  const getTimeSinceLastCheckIn = () => {
    if (!dossiers.length) return '--';

    const activeDossiers = dossiers.filter((d) => d.isActive);
    if (activeDossiers.length === 0) return '--';

    // Find most recent check-in
    const now = Math.floor(Date.now() / 1000);
    let mostRecent = 0;

    for (const dossier of activeDossiers) {
      const lastCheckIn = Number(dossier.lastCheckIn);
      if (lastCheckIn > mostRecent) {
        mostRecent = lastCheckIn;
      }
    }

    const elapsed = now - mostRecent;

    if (elapsed < 60) return `${elapsed}s`;
    if (elapsed < 3600) return `${Math.floor(elapsed / 60)}m`;
    if (elapsed < 86400) return `${Math.floor(elapsed / 3600)}h`;
    return `${Math.floor(elapsed / 86400)}d`;
  };

  /**
   * Handle system-level check-in (all dossiers)
   */
  const handleCheckIn = async () => {
    setIsCheckingIn(true);
    try {
      const result = await checkInAll();
      if (result.success) {
        console.log('✅ Check-in all successful');
      } else {
        console.error('❌ Check-in all failed:', result.error);
      }
    } finally {
      setIsCheckingIn(false);
    }
  };

  /**
   * Handle share status
   */
  const handleShareStatus = async () => {
    try {
      await Share.share({
        message: `Check my Canary status: https://canary.app/status/${address}`,
      });
    } catch (error) {
      console.error('Failed to share:', error);
    }
  };

  const countdown = getCountdownTime();
  const activeDossierCount = dossiers.filter((d) => d.isActive).length;

  // If not connected, show connection screen
  if (!isConnected) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.connectContainer}>
          <Text style={[styles.connectTitle, { color: theme.colors.primary }]}>Canary</Text>
          <Text style={[styles.connectSubtitle, { color: theme.colors.textSecondary }]}>Connecting wallet...</Text>
          <ActivityIndicator size="large" color={theme.colors.primary} style={styles.connectLoader} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 16 }]}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={loadDossiers} colors={[theme.colors.primary]} />
        }>
        {isLoading ? (
          // Loading State
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Loading system status...</Text>
          </View>
        ) : dossiers.length > 0 ? (
          // Main Content
          <View style={styles.content}>
            {/* System Control Card */}
            <View style={[styles.systemCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              {/* Header with Toggle */}
              <View style={[styles.systemCardHeader, { borderBottomColor: theme.colors.border }]}>
                <Text style={[styles.systemCardLabel, { color: theme.colors.textSecondary }]}>SYSTEM CONTROL</Text>
                <TouchableOpacity
                  style={[styles.toggle, systemEnabled ? styles.toggleOn : styles.toggleOff]}
                  onPress={() => setSystemEnabled(!systemEnabled)}>
                  <View style={[styles.toggleThumb, systemEnabled && styles.toggleThumbOn]} />
                  <Text style={styles.toggleLabel}>{systemEnabled ? 'ON' : 'OFF'}</Text>
                </TouchableOpacity>
              </View>

              {/* Status Display */}
              <View style={styles.systemCardBody}>
                <Text
                  style={[
                    styles.statusText,
                    systemEnabled ? { color: theme.colors.text } : { color: theme.colors.textSecondary },
                  ]}>
                  {systemEnabled ? 'ACTIVE' : 'INACTIVE'}
                </Text>

                {/* Check In Button */}
                <TouchableOpacity
                  style={[
                    styles.checkInButton,
                    systemEnabled && !isCheckingIn && activeDossierCount > 0
                      ? { backgroundColor: theme.colors.text, borderColor: theme.colors.text }
                      : styles.checkInButtonDisabled,
                  ]}
                  onPress={handleCheckIn}
                  disabled={!systemEnabled || isCheckingIn || activeDossierCount === 0}>
                  {isCheckingIn ? (
                    <View style={styles.checkInButtonContent}>
                      <ActivityIndicator size="small" color="#FFFFFF" />
                      <Text style={styles.checkInButtonText}>CHECKING IN...</Text>
                    </View>
                  ) : (
                    <View style={styles.checkInButtonContent}>
                      <Text style={styles.checkInIcon}>✓</Text>
                      <Text style={styles.checkInButtonText}>CHECK IN NOW</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Status Cards */}
            <View style={styles.statusCards}>
              {/* System Status Card */}
              <View style={[styles.statusCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                <View style={styles.statusCardContent}>
                  <View style={styles.statusCardInfo}>
                    <View style={styles.statusCardTitleRow}>
                      <View style={[styles.statusDot, countdown.isExpired ? styles.statusDotRed : styles.statusDotGreen]} />
                      <Text style={[styles.statusCardTitle, { color: theme.colors.text }]}>SYSTEM STATUS</Text>
                    </View>
                    <Text style={[styles.statusCardSubtitle, { color: theme.colors.textSecondary }]}>
                      {countdown.isExpired ? 'Check-in required' : 'System healthy'}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.statusCardValue,
                      { color: countdown.isExpired ? theme.colors.error : theme.colors.success },
                    ]}>
                    {countdown.display}
                  </Text>
                </View>
              </View>

              {/* Last Check-in Card */}
              <View style={[styles.statusCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                <View style={styles.statusCardContent}>
                  <View style={styles.statusCardInfo}>
                    <Text style={[styles.statusCardTitle, { color: theme.colors.text }]}>LAST CHECK-IN</Text>
                    <Text style={[styles.statusCardSubtitle, { color: theme.colors.textSecondary }]}>
                      Time since last activity
                    </Text>
                  </View>
                  <Text style={[styles.statusCardValue, { color: theme.colors.text }]}>{getTimeSinceLastCheckIn()}</Text>
                </View>
              </View>

              {/* Active Dossiers Card */}
              <View style={[styles.statusCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                <View style={styles.statusCardContent}>
                  <View style={styles.statusCardInfo}>
                    <Text style={[styles.statusCardTitle, { color: theme.colors.text }]}>ACTIVE DOSSIERS</Text>
                    <Text style={[styles.statusCardSubtitle, { color: theme.colors.textSecondary }]}>
                      Protected with encryption
                    </Text>
                  </View>
                  <Text style={[styles.statusCardValueLarge, { color: theme.colors.text }]}>{activeDossierCount}</Text>
                </View>
              </View>
            </View>

            {/* Share Status Button */}
            <TouchableOpacity
              style={[styles.shareButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
              onPress={handleShareStatus}>
              <Text style={styles.shareIcon}>⤴</Text>
              <Text style={[styles.shareButtonText, { color: theme.colors.text }]}>SHARE STATUS</Text>
            </TouchableOpacity>
          </View>
        ) : (
          // No Dossiers State
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIcon, { borderColor: theme.colors.border, backgroundColor: theme.colors.card }]}>
              <Text style={[styles.emptyIconText, { color: theme.colors.textSecondary }]}>🔒</Text>
            </View>
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>No Active Dossiers</Text>
            <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
              Create your first dossier to start using the check-in system
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    marginBottom: 8,
  },
  connectSubtitle: {
    fontSize: 16,
    marginBottom: 24,
  },
  connectLoader: {
    marginTop: 16,
  },
  scrollContent: {
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  loadingText: {
    fontSize: 16,
    marginTop: 16,
  },
  content: {
    padding: 24,
  },
  systemCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 32,
  },
  systemCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  systemCardLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
  },
  toggle: {
    width: 56,
    height: 28,
    borderRadius: 14,
    padding: 2,
    justifyContent: 'center',
  },
  toggleOn: {
    backgroundColor: '#4CAF50',
  },
  toggleOff: {
    backgroundColor: '#9E9E9E',
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    position: 'absolute',
    left: 2,
  },
  toggleThumbOn: {
    left: 30,
  },
  toggleLabel: {
    position: 'absolute',
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    left: 8,
    right: 8,
    textAlign: 'center',
  },
  systemCardBody: {
    paddingHorizontal: 20,
    paddingVertical: 32,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 48,
    fontWeight: '700',
    marginBottom: 32,
    letterSpacing: -1,
  },
  checkInButton: {
    width: '100%',
    maxWidth: 400,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  checkInButtonDisabled: {
    backgroundColor: '#E0E0E0',
    borderColor: '#E0E0E0',
  },
  checkInButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkInIcon: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  checkInButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 1.5,
  },
  statusCards: {
    gap: 12,
    marginBottom: 24,
  },
  statusCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 20,
  },
  statusCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusDotGreen: {
    backgroundColor: '#4CAF50',
  },
  statusDotRed: {
    backgroundColor: '#E53935',
  },
  statusCardInfo: {
    flex: 1,
    marginRight: 16,
  },
  statusCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 4,
  },
  statusCardSubtitle: {
    fontSize: 12,
  },
  statusCardValue: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  statusCardValueLarge: {
    fontSize: 28,
    fontWeight: '700',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
  },
  shareIcon: {
    fontSize: 20,
  },
  shareButtonText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1.5,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyIconText: {
    fontSize: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
});
