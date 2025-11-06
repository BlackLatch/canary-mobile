import React from 'react';
import { ActivityIndicator, View, StyleSheet, Image, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { useWallet } from '../contexts/WalletContext';
import { LoginScreen } from '../screens/LoginScreen';
import { AppNavigator } from '../navigation/AppNavigator';

export const AuthenticatedApp = () => {
  const { address, isLoading } = useWallet();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.logoContainer}>
          <Image
            source={require('../../assets/solo-canary.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.logoText}>CANARY</Text>
        </View>
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
  logoContainer: {
    alignItems: 'center',
  },
  logo: {
    height: 80,
    width: 80,
    marginBottom: 16,
  },
  logoText: {
    fontSize: 24,
    fontWeight: '600',
    letterSpacing: 2,
    color: '#111827',
  },
});
