/**
 * Dossiers Screen
 *
 * Grid view of user's dossiers matching reference implementation
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Image,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import { useDossier } from '../contexts/DossierContext';
import { useTheme } from '../contexts/ThemeContext';
import { EmptyState } from '../components/EmptyState';
import type { Dossier } from '../types/dossier';

export const DossiersScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { dossiers, isLoading, refreshDossiers } = useDossier();
  const { theme } = useTheme();
  const [showInactive, setShowInactive] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every second for countdown
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getRemainingTime = (dossier: Dossier) => {
    const now = Math.floor(Date.now() / 1000);
    const lastCheckIn = Number(dossier.lastCheckIn);
    const interval = Number(dossier.checkInInterval);
    const nextCheckInDue = lastCheckIn + interval;
    const remaining = nextCheckInDue - now;

    if (!dossier.isActive) {
      return { display: 'Paused', color: theme.colors.warning, expired: false };
    }

    if (remaining <= 0) {
      return { display: '⚠ EXPIRED', color: theme.colors.error, expired: true };
    }

    const hours = Math.floor(remaining / 3600);
    const minutes = Math.floor((remaining % 3600) / 60);
    const seconds = remaining % 60;

    let color = theme.colors.success;
    if (remaining < 300) {  // 5 minutes
      color = theme.colors.error;
    } else if (remaining < 1800) {  // 30 minutes
      color = '#FF9500';
    } else if (remaining < 7200) {  // 2 hours
      color = '#FFB800';
    }

    let display = '';
    if (hours > 0) {
      display = `${hours}H ${minutes}M`;
    } else if (minutes > 0) {
      display = `${minutes}M ${seconds}S`;
    } else {
      display = `${seconds}S`;
    }

    return { display, color, expired: false };
  };

  const filteredDossiers = dossiers.filter(d => showInactive || d.isActive);
  const hasInactive = dossiers.some(d => !d.isActive);

  const renderDossierCard = (dossier: Dossier) => {
    const timeInfo = getRemainingTime(dossier);
    const displayName = dossier.name || `Dossier #${dossier.id.toString()}`;
    const truncatedName = displayName.length > 24
      ? `${displayName.substring(0, 24)}...`
      : displayName;
    const isPrivate = dossier.recipients && dossier.recipients.length > 0;

    return (
      <TouchableOpacity
        key={dossier.id.toString()}
        style={[styles.dossierCard, {
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.border
        }]}
        onPress={() => navigation.navigate('DossierDetail' as never, { dossier } as never)}
      >
        {/* Header */}
        <View style={[styles.cardHeader, { borderBottomColor: theme.colors.border }]}>
          <Text
            style={[styles.dossierName, { color: theme.colors.text }]}
            numberOfLines={1}
          >
            {truncatedName}
          </Text>
          <View style={styles.statusBadge}>
            <View style={[
              styles.statusDot,
              {
                backgroundColor: timeInfo.expired ? '#FF6B6B' : dossier.isActive ? '#B8E994' : '#6b7280',
                shadowColor: timeInfo.expired ? '#FF6B6B' : dossier.isActive ? '#B8E994' : '#6b7280',
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
              {timeInfo.expired ? 'Released' : dossier.isActive ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>

        {/* Body */}
        <View style={styles.cardBody}>
          {/* Private/Public Indicator */}
          <View style={styles.visibilityContainer}>
            <View style={[
              styles.visibilityBadge,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border
              }
            ]}>
              {isPrivate ? (
                <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={theme.colors.textSecondary} strokeWidth={2}>
                  <Path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </Svg>
              ) : (
                <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={theme.colors.textSecondary} strokeWidth={2}>
                  <Path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </Svg>
              )}
              <Text style={[
                styles.visibilityText,
                { color: theme.colors.textSecondary }
              ]}>
                {isPrivate ? 'Private' : 'Public'}
              </Text>
            </View>
          </View>

          {/* Time Remaining */}
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
        </View>

        {/* Footer */}
        <View style={[styles.cardFooter, { borderTopColor: theme.colors.border }]}>
          <TouchableOpacity
            style={[
              styles.viewButton,
              timeInfo.expired
                ? styles.viewButtonExpired
                : { backgroundColor: theme.colors.background, borderColor: theme.colors.border }
            ]}
            onPress={() => navigation.navigate('DossierDetail' as never, { dossier } as never)}
          >
            <Text style={[
              styles.viewButtonText,
              { color: timeInfo.expired ? '#FFFFFF' : theme.colors.text }
            ]}>
              {timeInfo.expired ? 'VIEW RELEASE' : 'VIEW DETAILS'}
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderCreateCard = () => (
    <TouchableOpacity
      style={[styles.dossierCard, styles.createCard, {
        backgroundColor: theme.colors.card,
        borderColor: theme.colors.border
      }]}
      onPress={() => navigation.navigate('CreateDossier' as never)}
    >
      <View style={styles.createCardContent}>
        <Text style={[styles.createIcon, { color: theme.colors.textSecondary }]}>+</Text>
        <Text style={[styles.createTitle, { color: theme.colors.text }]}>CREATE DOSSIER</Text>
        <Text style={[styles.createSubtitle, { color: theme.colors.textSecondary }]}>
          Encrypt and protect a new dossier
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => <EmptyState />;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 16 }]}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refreshDossiers}
            tintColor={theme.colors.primary}
          />
        }
      >
        {/* Screen Header */}
        <View style={styles.screenHeader}>
          <View style={styles.screenTitleRow}>
            <View style={styles.screenTitleLeft}>
              <Icon name="folder" size={32} color="#e53e3e" />
              <Text style={[styles.screenTitle, { color: theme.colors.text }]}>MY DOSSIERS</Text>
            </View>
            <Image
              source={require('../assets/canary-icon.png')}
              style={styles.canaryIcon}
              resizeMode="contain"
            />
          </View>
        </View>

        {dossiers.length === 0 ? (
          renderEmptyState()
        ) : (
          <>
            {/* Filter Controls */}
            <View style={styles.filterContainer}>
              <Text style={[styles.countLabel, { color: theme.colors.textSecondary }]}>
                {filteredDossiers.length} DOSSIER{filteredDossiers.length !== 1 ? 'S' : ''}
              </Text>
              {hasInactive && (
                <TouchableOpacity
                  style={[
                    styles.filterButton,
                    showInactive
                      ? { backgroundColor: theme.colors.text, borderColor: theme.colors.text }
                      : { backgroundColor: theme.colors.background, borderColor: theme.colors.border }
                  ]}
                  onPress={() => setShowInactive(!showInactive)}
                >
                  <Text style={[
                    styles.filterButtonText,
                    { color: showInactive ? theme.colors.background : theme.colors.text }
                  ]}>
                    {showInactive ? 'Hide Inactive' : 'Show All'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Dossiers Grid */}
            <View style={styles.grid}>
              {renderCreateCard()}
              {filteredDossiers.map(renderDossierCard)}
            </View>
          </>
        )}
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
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  countLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  grid: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 16,
  },
  dossierCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    minHeight: 180,
  },
  createCard: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  createCardContent: {
    alignItems: 'center',
    padding: 24,
  },
  createIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  createTitle: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  createSubtitle: {
    fontSize: 12,
    textAlign: 'center',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    borderBottomWidth: 1,
  },
  dossierName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 12,
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
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
  },
  cardBody: {
    padding: 16,
    flex: 1,
  },
  visibilityContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  visibilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  visibilityText: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'capitalize',
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
  },
  viewButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  viewButtonExpired: {
    backgroundColor: '#10B981',
    borderWidth: 0,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  viewButtonText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1.5,
  },
  // Screen Header Styles
  screenHeader: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  screenTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  canaryIcon: {
    width: 32,
    height: 32,
  },
});
