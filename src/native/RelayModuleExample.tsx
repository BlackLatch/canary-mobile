import React, { useEffect, useState } from 'react';
import { View, Text, Button, Alert } from 'react-native';
import RelayModule from './RelayModule';

/**
 * Example component showing how to use the Relay native module
 */
export const RelayExample = () => {
  const [initialized, setInitialized] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [dataDir, setDataDir] = useState('');

  useEffect(() => {
    // Initialize Relay when component mounts
    initializeRelay();

    // Set up message listeners
    const messageListener = RelayModule.addMessageListener((messageJSON) => {
      console.log('Received Relay message:', messageJSON);
      const message = JSON.parse(messageJSON);
      Alert.alert('New Message', `From: ${message.From}\nText: ${message.Text}`);
    });

    const errorListener = RelayModule.addErrorListener((error) => {
      console.error('Relay error:', error);
      Alert.alert('Relay Error', error.error);
    });

    // Cleanup listeners on unmount
    return () => {
      messageListener.remove();
      errorListener.remove();
    };
  }, []);

  const initializeRelay = async () => {
    try {
      // Initialize with default app directory (pass empty string)
      const dir = await RelayModule.initialize('');
      setDataDir(dir);
      setInitialized(true);
      console.log('Relay initialized at:', dir);

      // Load existing accounts
      await loadAccounts();
    } catch (error) {
      console.error('Failed to initialize Relay:', error);
      Alert.alert('Error', 'Failed to initialize Relay');
    }
  };

  const loadAccounts = async () => {
    try {
      const accountList = await RelayModule.listAccounts();
      setAccounts(accountList);
      console.log('Loaded accounts:', accountList);
    } catch (error) {
      console.error('Failed to load accounts:', error);
    }
  };

  const createTestAccount = async () => {
    try {
      const nickname = 'TestMobile' + Date.now();
      const accountId = await RelayModule.createAccount(
        nickname,
        false, // torOnly
        [], // servers (empty = use defaults)
        '' // passphrase
      );
      Alert.alert('Success', `Created account: ${nickname}\nID: ${accountId}`);
      await loadAccounts();
    } catch (error: any) {
      console.error('Failed to create account:', error);
      Alert.alert('Error', error.message || 'Failed to create account');
    }
  };

  const sendTestMessage = async () => {
    try {
      if (accounts.length < 2) {
        Alert.alert('Error', 'Need at least 2 accounts to send a message');
        return;
      }

      const fromAccount = accounts[0].account_id;
      const toAccount = accounts[1].account_id;

      const result = await RelayModule.sendTextMessage(
        fromAccount,
        toAccount,
        'Hello from React Native!'
      );
      Alert.alert('Success', result);
    } catch (error: any) {
      console.error('Failed to send message:', error);
      Alert.alert('Error', error.message || 'Failed to send message');
    }
  };

  const startListening = async () => {
    try {
      if (accounts.length === 0) {
        Alert.alert('Error', 'No accounts to listen on');
        return;
      }

      // Start listening for messages on all accounts
      const nicknames = accounts.map(acc => acc.nickname);
      await RelayModule.startConnectLoop(nicknames);
      Alert.alert('Success', 'Started listening for messages');
    } catch (error: any) {
      console.error('Failed to start connect loop:', error);
      Alert.alert('Error', error.message || 'Failed to start listening');
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 10 }}>
        Relay Module Example
      </Text>

      <Text style={{ marginBottom: 10 }}>
        Initialized: {initialized ? 'Yes' : 'No'}
      </Text>
      <Text style={{ marginBottom: 10 }}>
        Data Directory: {dataDir}
      </Text>
      <Text style={{ marginBottom: 20 }}>
        Accounts: {accounts.length}
      </Text>

      {accounts.map((acc, idx) => (
        <Text key={idx} style={{ marginBottom: 5 }}>
          {idx + 1}. {acc.nickname} ({acc.account_id.substring(0, 12)}...)
        </Text>
      ))}

      <Button title="Create Test Account" onPress={createTestAccount} />
      <View style={{ height: 10 }} />
      <Button title="Send Test Message" onPress={sendTestMessage} />
      <View style={{ height: 10 }} />
      <Button title="Start Listening" onPress={startListening} />
      <View style={{ height: 10 }} />
      <Button title="Reload Accounts" onPress={loadAccounts} />
    </View>
  );
};

export default RelayExample;
