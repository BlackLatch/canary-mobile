/**
 * Example usage of the Tor Module in React Native
 *
 * This demonstrates how to initialize Tor, check its status,
 * create accounts, and send messages through the Tor network.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, Button, StyleSheet, ScrollView, Alert } from 'react-native';
import TorModule, {
  initializeTor,
  getTorStatus,
  isInitialized,
  createAccount,
  listAccounts,
  parseAccounts,
  parseInitialState,
} from '../lib/torModule';

export default function TorExample() {
  const [torStatus, setTorStatus] = useState<string>('Not initialized');
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkTorStatus();
  }, []);

  const checkTorStatus = async () => {
    try {
      const initialized = await isInitialized();
      setTorStatus(initialized ? 'Initialized' : 'Not initialized');
    } catch (error) {
      console.error('Error checking Tor status:', error);
      setTorStatus('Error checking status');
    }
  };

  const handleInitializeTor = async () => {
    setLoading(true);
    try {
      // Use app's internal storage
      const dataDir = '/data/data/com.blacklatch.canary/files/tor_data';
      const result = await initializeTor(dataDir);
      Alert.alert('Success', result);
      await checkTorStatus();

      // Get detailed status
      const statusJSON = await getTorStatus();
      const state = parseInitialState(statusJSON);
      console.log('Tor Status:', state.tor);
    } catch (error: any) {
      console.error('Failed to initialize Tor:', error);
      Alert.alert('Error', error.message || 'Failed to initialize Tor');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async () => {
    setLoading(true);
    try {
      const nickname = `TestUser_${Date.now()}`;
      const accountID = await createAccount(
        nickname,
        true, // torOnly = true
        [], // no specific servers
        '' // no passphrase
      );
      Alert.alert('Success', `Account created: ${accountID}`);
      await handleListAccounts();
    } catch (error: any) {
      console.error('Failed to create account:', error);
      Alert.alert('Error', error.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const handleListAccounts = async () => {
    setLoading(true);
    try {
      const accountsJSON = await listAccounts();
      const parsedAccounts = parseAccounts(accountsJSON);
      setAccounts(parsedAccounts);
      console.log('Accounts:', parsedAccounts);
    } catch (error: any) {
      console.error('Failed to list accounts:', error);
      Alert.alert('Error', error.message || 'Failed to list accounts');
    } finally {
      setLoading(false);
    }
  };

  const handleGetTorStatus = async () => {
    setLoading(true);
    try {
      const statusJSON = await getTorStatus();
      const state = parseInitialState(statusJSON);
      const torInfo = state.tor;

      Alert.alert(
        'Tor Status',
        `Available: ${torInfo.is_available}\n` +
          `Mode: ${torInfo.mode || 'N/A'}\n` +
          `Error: ${torInfo.error || 'None'}`
      );
    } catch (error: any) {
      console.error('Failed to get Tor status:', error);
      Alert.alert('Error', error.message || 'Failed to get Tor status');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Tor Module Example</Text>

      <View style={styles.statusContainer}>
        <Text style={styles.statusLabel}>Status:</Text>
        <Text style={styles.statusValue}>{torStatus}</Text>
      </View>

      <Button
        title="Initialize Tor"
        onPress={handleInitializeTor}
        disabled={loading}
      />

      <View style={styles.spacer} />

      <Button
        title="Get Tor Status"
        onPress={handleGetTorStatus}
        disabled={loading}
      />

      <View style={styles.spacer} />

      <Button
        title="Create Account"
        onPress={handleCreateAccount}
        disabled={loading}
      />

      <View style={styles.spacer} />

      <Button
        title="List Accounts"
        onPress={handleListAccounts}
        disabled={loading}
      />

      <View style={styles.accountsContainer}>
        <Text style={styles.accountsTitle}>Accounts ({accounts.length}):</Text>
        {accounts.map((account, index) => (
          <View key={index} style={styles.accountItem}>
            <Text style={styles.accountNickname}>{account.nickname}</Text>
            <Text style={styles.accountId} numberOfLines={1}>
              {account.account_id}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 10,
  },
  statusValue: {
    fontSize: 16,
    color: '#333',
  },
  spacer: {
    height: 10,
  },
  accountsContainer: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 5,
  },
  accountsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  accountItem: {
    padding: 10,
    marginBottom: 10,
    backgroundColor: '#fff',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  accountNickname: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  accountId: {
    fontSize: 12,
    color: '#666',
  },
});
