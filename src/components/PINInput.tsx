/**
 * Reusable PIN Input Component
 *
 * A secure 6-digit PIN input field with masked display
 * and numeric keypad optimized for mobile
 */

import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Keyboard,
  Platform,
  Vibration,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../hooks/useTheme';

interface PINInputProps {
  /**
   * Callback when PIN entry is complete
   */
  onComplete: (pin: string) => void;

  /**
   * Optional error message to display
   */
  error?: string;

  /**
   * Whether to auto-submit when 6 digits are entered
   */
  autoSubmit?: boolean;

  /**
   * Title text above the PIN input
   */
  title?: string;

  /**
   * Subtitle text below the title
   */
  subtitle?: string;

  /**
   * Whether the component is in loading state
   */
  loading?: boolean;

  /**
   * Whether to show the PIN digits (for confirmation)
   */
  showDigits?: boolean;

  /**
   * Callback when PIN changes
   */
  onChange?: (pin: string) => void;

  /**
   * Test ID for testing
   */
  testID?: string;
}

export const PINInput: React.FC<PINInputProps> = ({
  onComplete,
  error,
  autoSubmit = true,
  title = 'Enter PIN',
  subtitle,
  loading = false,
  showDigits = false,
  onChange,
  testID = 'pin-input',
}) => {
  const theme = useTheme();
  const [pin, setPin] = useState('');
  const [shakeAnimation, setShakeAnimation] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // Focus input on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Handle error animation
  useEffect(() => {
    if (error) {
      // Vibrate on error (Android)
      if (Platform.OS === 'android') {
        Vibration.vibrate(100);
      }

      // Trigger shake animation
      setShakeAnimation(true);
      const timer = setTimeout(() => {
        setShakeAnimation(false);
        setPin(''); // Clear PIN on error
        inputRef.current?.focus();
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [error]);

  /**
   * Handle PIN input change
   */
  const handlePinChange = (value: string) => {
    // Only allow digits and max 6 characters
    const cleanValue = value.replace(/[^0-9]/g, '').slice(0, 6);
    setPin(cleanValue);

    // Notify onChange callback
    onChange?.(cleanValue);

    // Auto-submit when 6 digits are entered
    if (cleanValue.length === 6 && autoSubmit) {
      // Dismiss keyboard
      Keyboard.dismiss();

      // Small delay for visual feedback
      setTimeout(() => {
        onComplete(cleanValue);
      }, 100);
    }
  };

  /**
   * Handle submit button press
   */
  const handleSubmit = () => {
    if (pin.length === 6) {
      Keyboard.dismiss();
      onComplete(pin);
    }
  };

  /**
   * Render PIN dots/digits
   */
  const renderPinDots = () => {
    const dots = [];
    for (let i = 0; i < 6; i++) {
      const filled = i < pin.length;
      const digit = pin[i];

      dots.push(
        <View
          key={i}
          style={[
            styles.dot,
            {
              backgroundColor: filled
                ? theme.colors.primary
                : theme.colors.surfaceVariant,
              borderColor: filled ? theme.colors.primary : theme.colors.outline,
            },
            error && styles.dotError,
            shakeAnimation && styles.dotShake,
          ]}
        >
          {showDigits && filled && (
            <Text style={[styles.digitText, { color: theme.colors.onPrimary }]}>
              {digit}
            </Text>
          )}
        </View>
      );
    }
    return dots;
  };

  return (
    <View style={styles.container} testID={testID}>
      {/* Title */}
      {title && (
        <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
      )}

      {/* Subtitle */}
      {subtitle && (
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          {subtitle}
        </Text>
      )}

      {/* PIN Dots */}
      <View style={styles.dotsContainer}>{renderPinDots()}</View>

      {/* Hidden Input */}
      <TextInput
        ref={inputRef}
        value={pin}
        onChangeText={handlePinChange}
        keyboardType="number-pad"
        maxLength={6}
        secureTextEntry={!showDigits}
        autoComplete="off"
        autoCorrect={false}
        autoCapitalize="none"
        style={styles.hiddenInput}
        testID={`${testID}-input`}
        editable={!loading}
        caretHidden
        contextMenuHidden
      />

      {/* Error Message */}
      {error && (
        <Text style={[styles.error, { color: theme.colors.error }]}>{error}</Text>
      )}

      {/* Submit Button (if not auto-submit) */}
      {!autoSubmit && (
        <TouchableOpacity
          style={[
            styles.submitButton,
            {
              backgroundColor:
                pin.length === 6 ? theme.colors.primary : theme.colors.surfaceVariant,
              opacity: loading ? 0.5 : 1,
            },
          ]}
          onPress={handleSubmit}
          disabled={pin.length !== 6 || loading}
          testID={`${testID}-submit`}
        >
          {loading ? (
            <ActivityIndicator size="small" color={theme.colors.onPrimary} />
          ) : (
            <Text
              style={[
                styles.submitButtonText,
                {
                  color:
                    pin.length === 6
                      ? theme.colors.onPrimary
                      : theme.colors.textSecondary,
                },
              ]}
            >
              Continue
            </Text>
          )}
        </TouchableOpacity>
      )}

      {/* Tap to focus hint */}
      {pin.length === 0 && !error && (
        <TouchableOpacity
          onPress={() => inputRef.current?.focus()}
          style={styles.tapHint}
        >
          <Text style={[styles.hintText, { color: theme.colors.textSecondary }]}>
            Tap to enter PIN
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 32,
    textAlign: 'center',
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  dot: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotError: {
    borderColor: '#FF5252',
  },
  dotShake: {
    // Shake animation would be implemented with Animated API
    transform: [{ translateX: 0 }],
  },
  digitText: {
    fontSize: 18,
    fontWeight: '600',
  },
  hiddenInput: {
    position: 'absolute',
    width: 0,
    height: 0,
    opacity: 0,
  },
  error: {
    fontSize: 14,
    marginTop: 16,
    textAlign: 'center',
  },
  submitButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 32,
    minWidth: 120,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  tapHint: {
    marginTop: 16,
    padding: 8,
  },
  hintText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
});