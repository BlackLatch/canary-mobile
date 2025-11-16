import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import Jazzicon from 'react-native-jazzicon';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface LocalAccountCardProps {
  address: string;
  onSelect: () => void;
  onDelete?: () => void;
  isLoading?: boolean;
}

export const LocalAccountCard: React.FC<LocalAccountCardProps> = ({
  address,
  onSelect,
  onDelete,
  isLoading,
}) => {
  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.label}>Local Account</Text>
        {onDelete && (
          <TouchableOpacity onPress={onDelete} style={styles.deleteButton}>
            <Icon name="close" size={18} color="#6B7280" />
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity
        style={styles.accountButton}
        onPress={onSelect}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#111827" />
        ) : (
          <>
            <View style={styles.accountInfo}>
              <Jazzicon size={40} address={address} />
              <View style={styles.addressContainer}>
                <Text style={styles.address}>{formatAddress(address)}</Text>
                <Text style={styles.hint}>Tap to use this account</Text>
              </View>
            </View>
            <Icon name="chevron-right" size={24} color="#9CA3AF" />
          </>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  deleteButton: {
    padding: 4,
  },
  accountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  accountInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  addressContainer: {
    marginLeft: 12,
    flex: 1,
  },
  address: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  hint: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
});
