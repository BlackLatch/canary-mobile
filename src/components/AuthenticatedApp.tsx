import React from 'react';
import { ActivityIndicator, View, StyleSheet, Image, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useWallet } from '../contexts/WalletContext';
import { LoginScreen } from '../screens/LoginScreen';
import { ImportAccountScreen } from '../screens/ImportAccountScreen';
import { CreatePINScreen } from '../screens/CreatePINScreen';
import { PINEntryScreen } from '../screens/PINEntryScreen';
import { AppNavigator } from '../navigation/AppNavigator';

const UnauthStack = createNativeStackNavigator();

const UnauthenticatedNavigator = () => {
  return (
    <NavigationContainer>
      <UnauthStack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        <UnauthStack.Screen name="Login" component={LoginScreen} />
        <UnauthStack.Screen name="ImportAccount" component={ImportAccountScreen} />
        <UnauthStack.Screen name="CreatePIN" component={CreatePINScreen} />
      </UnauthStack.Navigator>
    </NavigationContainer>
  );
};

export const AuthenticatedApp = () => {
  const { address, isLoading, isLocked, showAccountSwitcher } = useWallet();

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

  // Show unauthenticated navigator if no wallet is connected OR user wants to switch accounts
  if (!address || showAccountSwitcher) {
    return <UnauthenticatedNavigator />;
  }

  // Show PIN entry screen if wallet is locked
  if (isLocked) {
    return <PINEntryScreen />;
  }

  // Show main app with navigation if wallet is connected and unlocked
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
    flexDirection: 'column',
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
