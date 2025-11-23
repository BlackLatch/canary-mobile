/**
 * QR Scanner Component
 *
 * Reusable QR code scanner modal for scanning Ethereum addresses.
 * Uses VisionCamera with ML Kit barcode scanning.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Alert } from 'react-native';
import { Camera, useCameraDevice, useCodeScanner } from 'react-native-vision-camera';
import { useTheme } from '../contexts/ThemeContext';
import Icon from 'react-native-vector-icons/Feather';

interface QRScannerProps {
  visible: boolean;
  onClose: () => void;
  onScan: (address: string) => void;
}

export const QRScanner: React.FC<QRScannerProps> = ({ visible, onClose, onScan }) => {
  const { theme } = useTheme();
  const [hasPermission, setHasPermission] = useState(false);
  const device = useCameraDevice('back');

  useEffect(() => {
    if (visible) {
      requestCameraPermission();
    }
  }, [visible]);

  const requestCameraPermission = async () => {
    const permission = await Camera.requestCameraPermission();
    setHasPermission(permission === 'granted');
  };

  const validateEthereumAddress = (address: string): boolean => {
    // Basic Ethereum address validation (0x followed by 40 hex characters)
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  };

  const codeScanner = useCodeScanner({
    codeTypes: ['qr'],
    onCodeScanned: (codes) => {
      if (codes.length > 0 && codes[0].value) {
        const scannedValue = codes[0].value;

        // Try to extract Ethereum address from various formats
        let address = scannedValue;

        // Handle ethereum: URI scheme
        if (scannedValue.startsWith('ethereum:')) {
          address = scannedValue.replace('ethereum:', '').split('@')[0].split('?')[0];
        }

        // Validate Ethereum address
        if (validateEthereumAddress(address)) {
          onScan(address);
          onClose();
        } else {
          Alert.alert(
            'Invalid QR Code',
            'The scanned QR code does not contain a valid Ethereum address. Please scan an address QR code.',
            [{ text: 'OK' }]
          );
        }
      }
    },
  });

  if (!visible) return null;

  if (!hasPermission) {
    return (
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={onClose}
      >
        <View style={styles.permissionContainer}>
          <View style={[styles.permissionContent, { backgroundColor: theme.colors.card }]}>
            <Icon name="camera-off" size={48} color={theme.colors.textSecondary} />
            <Text style={[styles.permissionTitle, { color: theme.colors.text }]}>
              Camera Permission Required
            </Text>
            <Text style={[styles.permissionText, { color: theme.colors.textSecondary }]}>
              Please grant camera permission to scan QR codes
            </Text>
            <TouchableOpacity
              style={[styles.permissionButton, { backgroundColor: theme.colors.primary }]}
              onPress={requestCameraPermission}
            >
              <Text style={styles.permissionButtonText}>Grant Permission</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.cancelButton, { borderColor: theme.colors.border }]}
              onPress={onClose}
            >
              <Text style={[styles.cancelButtonText, { color: theme.colors.text }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  if (!device) {
    return (
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={onClose}
      >
        <View style={styles.permissionContainer}>
          <View style={[styles.permissionContent, { backgroundColor: theme.colors.card }]}>
            <Icon name="camera-off" size={48} color={theme.colors.textSecondary} />
            <Text style={[styles.permissionTitle, { color: theme.colors.text }]}>
              No Camera Available
            </Text>
            <Text style={[styles.permissionText, { color: theme.colors.textSecondary }]}>
              Your device does not have a camera available for scanning
            </Text>
            <TouchableOpacity
              style={[styles.cancelButton, { borderColor: theme.colors.border }]}
              onPress={onClose}
            >
              <Text style={[styles.cancelButtonText, { color: theme.colors.text }]}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <Camera
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={visible}
          codeScanner={codeScanner}
        />

        {/* Header */}
        <View style={[styles.header, { backgroundColor: 'rgba(0, 0, 0, 0.6)' }]}>
          <Text style={styles.headerTitle}>Scan QR Code</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="x" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Scanning frame */}
        <View style={styles.scanFrame}>
          <View style={styles.frameCorner} />
        </View>

        {/* Instructions */}
        <View style={[styles.instructionsContainer, { backgroundColor: 'rgba(0, 0, 0, 0.6)' }]}>
          <Text style={styles.instructionsText}>
            Position the QR code within the frame
          </Text>
          <Text style={styles.instructionsSubtext}>
            Scanning for Ethereum address
          </Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  closeButton: {
    padding: 8,
  },
  scanFrame: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  frameCorner: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderRadius: 16,
  },
  instructionsContainer: {
    padding: 24,
    alignItems: 'center',
  },
  instructionsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  instructionsSubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  permissionContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  permissionButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  permissionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  cancelButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
