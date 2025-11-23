/**
 * Notification Context
 *
 * Manages check-in notification preferences and scheduling.
 * Automatically reschedules notifications when dossiers change.
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { notificationService } from '../lib/notificationService';
import { useDossiers } from './DossierContext';

// Storage key for notification preferences
const NOTIFICATIONS_ENABLED_KEY = '@canary:notifications_enabled';

interface NotificationContextState {
  notificationsEnabled: boolean;
  toggleNotifications: () => Promise<void>;
  initializeNotifications: () => Promise<void>;
  isLoading: boolean;
}

const NotificationContext = createContext<NotificationContextState | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { dossiers, loading: dossiersLoading } = useDossiers();

  /**
   * Load notification preference from AsyncStorage on mount
   */
  useEffect(() => {
    loadNotificationPreference();
  }, []);

  /**
   * Auto-reschedule notifications when dossiers change or preference changes
   */
  useEffect(() => {
    if (!dossiersLoading && !isLoading) {
      rescheduleNotifications();
    }
  }, [dossiers, notificationsEnabled, dossiersLoading, isLoading]);

  /**
   * Load notification preference from persistent storage
   */
  const loadNotificationPreference = async () => {
    try {
      const stored = await AsyncStorage.getItem(NOTIFICATIONS_ENABLED_KEY);
      if (stored !== null) {
        const enabled = stored === 'true';
        setNotificationsEnabled(enabled);
      }
    } catch (error) {
      // Default to false on error
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Initialize notification system
   * - Requests permissions
   * - Enables notifications if granted
   */
  const initializeNotifications = async () => {
    try {
      const granted = await notificationService.initialize();
      if (granted) {
        setNotificationsEnabled(true);
        await AsyncStorage.setItem(NOTIFICATIONS_ENABLED_KEY, 'true');
        await rescheduleNotifications();
      }
    } catch (error) {
      // Silent fail - user can try again from settings
    }
  };

  /**
   * Toggle notifications on/off
   * - Requests permission if enabling
   * - Cancels all notifications if disabling
   */
  const toggleNotifications = async () => {
    try {
      if (!notificationsEnabled) {
        // Enabling - request permission first
        const hasPermission = await notificationService.checkPermission();

        if (!hasPermission) {
          const granted = await notificationService.requestPermission();
          if (!granted) {
            // Permission denied - don't enable
            return;
          }
        }

        // Initialize notification service
        await notificationService.initialize();

        // Enable and schedule
        setNotificationsEnabled(true);
        await AsyncStorage.setItem(NOTIFICATIONS_ENABLED_KEY, 'true');
        await rescheduleNotifications();
      } else {
        // Disabling - cancel all notifications
        setNotificationsEnabled(false);
        await AsyncStorage.setItem(NOTIFICATIONS_ENABLED_KEY, 'false');
        await notificationService.cancelAllNotifications();
      }
    } catch (error) {
      // Revert on error
      setNotificationsEnabled(!notificationsEnabled);
    }
  };

  /**
   * Reschedule notifications based on current dossiers
   */
  const rescheduleNotifications = async () => {
    if (!notificationsEnabled) {
      // If notifications disabled, ensure all are cancelled
      await notificationService.cancelAllNotifications();
      return;
    }

    try {
      // Schedule notifications for all active dossiers
      await notificationService.scheduleNotifications(dossiers);
    } catch (error) {
      // Silent fail - will retry on next dossier change
    }
  };

  const value: NotificationContextState = {
    notificationsEnabled,
    toggleNotifications,
    initializeNotifications,
    isLoading,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

/**
 * Custom hook to access notification context
 * @throws Error if used outside NotificationProvider
 */
export const useNotifications = (): NotificationContextState => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
