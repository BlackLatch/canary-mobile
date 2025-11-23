/**
 * Check-In Notification Service
 *
 * Manages local push notifications to alert users when their check-in deadline is approaching.
 * Uses @notifee/react-native for cross-platform notification support.
 *
 * Features:
 * - 4 notification thresholds: 24hr, 1hr, 15min before, and when deadline passes
 * - Variable priority levels (default → high → critical)
 * - Deep linking to CheckInScreen
 * - Multi-dossier support (schedules for soonest deadline)
 * - Permission handling
 */

import notifee, { AndroidImportance, AuthorizationStatus, TriggerType } from '@notifee/react-native';
import type { Dossier } from '../types/dossier';

// Notification channel IDs for Android
const ANDROID_CHANNEL_ID_DEFAULT = 'check-in-reminders-default';
const ANDROID_CHANNEL_ID_HIGH = 'check-in-reminders-high';
const ANDROID_CHANNEL_ID_CRITICAL = 'check-in-reminders-critical';

// Notification thresholds (in seconds before deadline)
const THRESHOLD_24_HOURS = 86400;  // 24 hours
const THRESHOLD_1_HOUR = 3600;     // 1 hour
const THRESHOLD_15_MIN = 900;      // 15 minutes
const THRESHOLD_EXPIRED = 0;       // Deadline passed

// Notification IDs for managing scheduled notifications
const NOTIFICATION_ID_24HR = 'check-in-24hr';
const NOTIFICATION_ID_1HR = 'check-in-1hr';
const NOTIFICATION_ID_15MIN = 'check-in-15min';
const NOTIFICATION_ID_EXPIRED = 'check-in-expired';

class NotificationService {
  private initialized = false;

  /**
   * Initialize notification channels (Android) and request permissions
   * Should be called once when app starts
   */
  async initialize(): Promise<boolean> {
    try {
      // Create Android notification channels
      await this.createAndroidChannels();

      // Check if we already have permission
      const settings = await notifee.getNotificationSettings();

      if (settings.authorizationStatus === AuthorizationStatus.AUTHORIZED) {
        this.initialized = true;
        return true;
      }

      // Request permission if not granted
      const permission = await notifee.requestPermission();
      this.initialized = permission.authorizationStatus === AuthorizationStatus.AUTHORIZED;

      return this.initialized;
    } catch (error) {
      return false;
    }
  }

  /**
   * Create Android notification channels with different priority levels
   */
  private async createAndroidChannels() {
    // Default priority channel (for 24hr warning)
    await notifee.createChannel({
      id: ANDROID_CHANNEL_ID_DEFAULT,
      name: 'Check-In Reminders',
      description: 'Reminders about upcoming check-in deadlines',
      importance: AndroidImportance.DEFAULT,
      sound: 'default',
    });

    // High priority channel (for 1hr and 15min warnings)
    await notifee.createChannel({
      id: ANDROID_CHANNEL_ID_HIGH,
      name: 'Urgent Check-In Reminders',
      description: 'Urgent reminders when check-in deadline is approaching',
      importance: AndroidImportance.HIGH,
      sound: 'default',
      vibration: true,
    });

    // Critical priority channel (for expired deadline)
    await notifee.createChannel({
      id: ANDROID_CHANNEL_ID_CRITICAL,
      name: 'Critical Check-In Alerts',
      description: 'Critical alerts when check-in deadline has passed',
      importance: AndroidImportance.HIGH,
      sound: 'default',
      vibration: true,
    });
  }

  /**
   * Check if notifications are enabled
   */
  async checkPermission(): Promise<boolean> {
    try {
      const settings = await notifee.getNotificationSettings();
      return settings.authorizationStatus === AuthorizationStatus.AUTHORIZED;
    } catch {
      return false;
    }
  }

  /**
   * Request notification permission from user
   */
  async requestPermission(): Promise<boolean> {
    try {
      const permission = await notifee.requestPermission();
      return permission.authorizationStatus === AuthorizationStatus.AUTHORIZED;
    } catch {
      return false;
    }
  }

  /**
   * Schedule all notifications for active dossiers
   * Finds the soonest expiring dossier and schedules notifications for it
   *
   * @param dossiers - Array of user's dossiers
   */
  async scheduleNotifications(dossiers: Dossier[]): Promise<void> {
    // Cancel all existing notifications first
    await this.cancelAllNotifications();

    // Filter active dossiers only
    const activeDossiers = dossiers.filter(d => d.isActive);

    if (activeDossiers.length === 0) {
      return;
    }

    // Find dossier with soonest expiration
    const soonestDossier = this.findSoonestExpiringDossier(activeDossiers);

    if (!soonestDossier) {
      return;
    }

    // Schedule notifications for this dossier
    await this.scheduleNotificationsForDossier(soonestDossier);
  }

  /**
   * Find the dossier that will expire soonest
   */
  private findSoonestExpiringDossier(dossiers: Dossier[]): Dossier | null {
    if (dossiers.length === 0) return null;

    const now = Math.floor(Date.now() / 1000);
    let soonestDossier: Dossier | null = null;
    let shortestTime = Infinity;

    for (const dossier of dossiers) {
      const lastCheckIn = Number(dossier.lastCheckIn);
      const interval = Number(dossier.checkInInterval);
      const nextCheckInDue = lastCheckIn + interval;
      const timeUntilDue = nextCheckInDue - now;

      if (timeUntilDue < shortestTime) {
        shortestTime = timeUntilDue;
        soonestDossier = dossier;
      }
    }

    return soonestDossier;
  }

  /**
   * Schedule all 4 notification thresholds for a specific dossier
   */
  private async scheduleNotificationsForDossier(dossier: Dossier): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    const lastCheckIn = Number(dossier.lastCheckIn);
    const interval = Number(dossier.checkInInterval);
    const deadline = lastCheckIn + interval;

    // Calculate notification times
    const time24hr = deadline - THRESHOLD_24_HOURS;
    const time1hr = deadline - THRESHOLD_1_HOUR;
    const time15min = deadline - THRESHOLD_15_MIN;
    const timeExpired = deadline;

    // Schedule each notification if it's in the future
    if (time24hr > now) {
      await this.scheduleNotification({
        id: NOTIFICATION_ID_24HR,
        title: 'Check-In Reminder',
        body: 'Your check-in deadline is in 24 hours. Don\'t forget to check in!',
        timestamp: time24hr * 1000,
        priority: 'default',
        dossierName: dossier.name,
      });
    }

    if (time1hr > now) {
      await this.scheduleNotification({
        id: NOTIFICATION_ID_1HR,
        title: 'Urgent: Check-In Soon',
        body: 'Your check-in deadline is in 1 hour. Check in now to keep your dossier secure.',
        timestamp: time1hr * 1000,
        priority: 'high',
        dossierName: dossier.name,
      });
    }

    if (time15min > now) {
      await this.scheduleNotification({
        id: NOTIFICATION_ID_15MIN,
        title: '⚠️ Check-In Urgently Needed',
        body: 'Only 15 minutes until your check-in deadline! Check in immediately.',
        timestamp: time15min * 1000,
        priority: 'high',
        dossierName: dossier.name,
      });
    }

    if (timeExpired > now) {
      await this.scheduleNotification({
        id: NOTIFICATION_ID_EXPIRED,
        title: '🚨 Check-In Deadline Passed',
        body: 'Your check-in deadline has passed. Your dossier may now be decryptable!',
        timestamp: timeExpired * 1000,
        priority: 'critical',
        dossierName: dossier.name,
      });
    }
  }

  /**
   * Schedule a single notification with timestamp trigger
   */
  private async scheduleNotification(options: {
    id: string;
    title: string;
    body: string;
    timestamp: number;
    priority: 'default' | 'high' | 'critical';
    dossierName: string;
  }): Promise<void> {
    try {
      // Select Android channel based on priority
      let androidChannelId = ANDROID_CHANNEL_ID_DEFAULT;
      if (options.priority === 'high') {
        androidChannelId = ANDROID_CHANNEL_ID_HIGH;
      } else if (options.priority === 'critical') {
        androidChannelId = ANDROID_CHANNEL_ID_CRITICAL;
      }

      await notifee.createTriggerNotification(
        {
          id: options.id,
          title: options.title,
          body: options.body,
          android: {
            channelId: androidChannelId,
            smallIcon: 'ic_launcher',
            pressAction: {
              id: 'default',
              launchActivity: 'default',
            },
          },
          ios: {
            categoryId: 'check-in',
            sound: 'default',
            critical: options.priority === 'critical',
            criticalVolume: options.priority === 'critical' ? 1.0 : undefined,
          },
          data: {
            type: 'check-in-reminder',
            dossierName: options.dossierName,
            priority: options.priority,
          },
        },
        {
          type: TriggerType.TIMESTAMP,
          timestamp: options.timestamp,
        }
      );

    } catch (error) {
      // Silent fail - don't block if notification scheduling fails
    }
  }

  /**
   * Cancel all scheduled notifications
   * Called when user checks in or when rescheduling
   */
  async cancelAllNotifications(): Promise<void> {
    try {
      // Cancel all notifications
      await notifee.cancelAllNotifications();

      // Also cancel any trigger notifications
      await notifee.cancelTriggerNotifications([
        NOTIFICATION_ID_24HR,
        NOTIFICATION_ID_1HR,
        NOTIFICATION_ID_15MIN,
        NOTIFICATION_ID_EXPIRED,
      ]);
    } catch (error) {
      // Silent fail
    }
  }

  /**
   * Get list of currently scheduled notifications (for debugging)
   */
  async getScheduledNotifications(): Promise<any[]> {
    try {
      return await notifee.getTriggerNotifications();
    } catch {
      return [];
    }
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
