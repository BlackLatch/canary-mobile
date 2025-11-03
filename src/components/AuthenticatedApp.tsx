import React from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { useWallet } from '../contexts/WalletContext';
import { LoginScreen } from '../screens/LoginScreen';
import { AppNavigator } from '../navigation/AppNavigator';

export const AuthenticatedApp = () => {
  const { address, isLoading } = useWallet();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E53935" />
      </View>
    );
  }

  // Show LoginScreen if no wallet is connected
  if (!address) {
    return <LoginScreen />;
  }

  // Show main app with navigation if wallet is connected
  return (
    <NavigationContainer>
      <AppNavigator />
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
});
