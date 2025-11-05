/**
 * SuccessDialog - Styled success dialog component
 *
 * Displays success messages in the app's visual language with theme support
 */

import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

export interface SuccessDialogProps {
  visible: boolean;
  title?: string;
  message: string;
  onDismiss: () => void;
  dismissText?: string;
}

export const SuccessDialog: React.FC<SuccessDialogProps> = ({
  visible,
  title = 'Success',
  message,
  onDismiss,
  dismissText = 'OK',
}) => {
  const { theme } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <View style={[styles.dialog, { backgroundColor: theme.colors.card }]}>
          {/* Success Icon */}
          <View style={[styles.iconContainer, { backgroundColor: '#10B981' + '20' }]}>
            <Text style={[styles.iconText, { color: '#10B981' }]}>✓</Text>
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: theme.colors.text }]}>
            {title}
          </Text>

          {/* Message */}
          <Text style={[styles.message, { color: theme.colors.textSecondary }]}>
            {message}
          </Text>

          {/* Dismiss Button */}
          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.colors.primary }]}
            onPress={onDismiss}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>{dismissText}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  dialog: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  iconText: {
    fontSize: 32,
    fontWeight: '600',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
