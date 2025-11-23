/**
 * Session Manager
 *
 * Handles app lifecycle events and wallet locking.
 * Automatically locks the wallet when the app goes to background
 * and clears sensitive data from memory.
 */

import { AppState, AppStateStatus, NativeEventSubscription } from 'react-native';

/**
 * Session state change event
 */
export interface SessionStateChangeEvent {
  type: 'locked' | 'background' | 'foreground';
  timestamp: number;
}

/**
 * Session event listener callback
 */
export type SessionEventListener = (event: SessionStateChangeEvent) => void;

/**
 * Session Manager - Manages wallet session lifecycle
 */
export class SessionManager {
  private appStateListener: NativeEventSubscription | null = null;
  private listeners: SessionEventListener[] = [];
  private isActive = false;
  private backgroundTime: number | null = null;

  /**
   * Starts the session manager
   * Sets up app state monitoring
   */
  start(): void {
    if (this.isActive) {
      return;
    }

    this.isActive = true;
    this.backgroundTime = null;
    this.setupAppStateListener();
  }

  /**
   * Stops the session manager
   * Cleans up listeners
   */
  stop(): void {
    if (!this.isActive) {
      return;
    }

    this.isActive = false;
    this.cleanupAppStateListener();
    this.backgroundTime = null;
  }

  /**
   * Adds a session event listener
   *
   * @param listener - Callback for session events
   * @returns Cleanup function to remove the listener
   */
  addEventListener(listener: SessionEventListener): () => void {
    this.listeners.push(listener);

    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Manually triggers a lock event
   * Useful for logout or manual lock actions
   */
  triggerLock(): void {
    this.notifyListeners({
      type: 'locked',
      timestamp: Date.now(),
    });
  }

  /**
   * Checks if the session is currently active
   */
  isSessionActive(): boolean {
    return this.isActive;
  }

  // ===== Private Methods =====

  /**
   * Sets up app state change listener
   */
  private setupAppStateListener(): void {
    // Clean up any existing listener
    this.cleanupAppStateListener();

    // Listen for app state changes
    this.appStateListener = AppState.addEventListener(
      'change',
      this.handleAppStateChange
    );

    // Check current app state
    const currentState = AppState.currentState;
    if (currentState === 'background' || currentState === 'inactive') {
      this.handleAppStateChange(currentState);
    }
  }

  /**
   * Cleans up app state listener
   */
  private cleanupAppStateListener(): void {
    if (this.appStateListener) {
      this.appStateListener.remove();
      this.appStateListener = null;
    }
  }

  /**
   * Handles app state changes
   * According to the spec: lock when app backgrounds, no timeout in foreground
   */
  private handleAppStateChange = (nextAppState: AppStateStatus): void => {
    if (!this.isActive) {
      return;
    }

    // App going to background or inactive
    if (nextAppState === 'background' || nextAppState === 'inactive') {
      this.backgroundTime = Date.now();

      // Notify listeners that app is going to background
      this.notifyListeners({
        type: 'background',
        timestamp: this.backgroundTime,
      });

      // Lock immediately when app backgrounds (per spec)
      this.triggerLock();
    }
    // App coming to foreground
    else if (nextAppState === 'active') {
      const wasInBackground = this.backgroundTime !== null;

      if (wasInBackground) {
        this.backgroundTime = null;

        // Notify listeners that app is returning to foreground
        this.notifyListeners({
          type: 'foreground',
          timestamp: Date.now(),
        });
      }
    }
  };

  /**
   * Notifies all listeners of a session event
   */
  private notifyListeners(event: SessionStateChangeEvent): void {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        // console.error('Session listener error:', error);
      }
    });
  }

  /**
   * Gets time spent in background (milliseconds)
   * Returns null if app is not in background
   */
  getBackgroundTime(): number | null {
    if (this.backgroundTime === null) {
      return null;
    }
    return Date.now() - this.backgroundTime;
  }

  /**
   * Checks if the app is currently in background
   */
  isInBackground(): boolean {
    return this.backgroundTime !== null;
  }
}

// Export singleton instance
export const sessionManager = new SessionManager();