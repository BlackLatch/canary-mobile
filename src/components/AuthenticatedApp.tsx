import React, { useEffect, createRef } from 'react';
import { ActivityIndicator, View, StyleSheet, Image, Text } from 'react-native';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import notifee, { EventType } from '@notifee/react-native';
import { useWallet } from '../contexts/WalletContext';
import { LoginScreen } from '../screens/LoginScreen';
import { ImportAccountScreen } from '../screens/ImportAccountScreen';
import { CreatePINScreen } from '../screens/CreatePINScreen';
import { PINEntryScreen } from '../screens/PINEntryScreen';
import { AppNavigator } from '../navigation/AppNavigator';

const UnauthStack = createNativeStackNavigator();

// Create navigation ref for accessing navigation from outside components
const navigationRef = createNavigationContainerRef();

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

  // Setup foreground notification event handler
  useEffect(() => {
    const unsubscribe = notifee.onForegroundEvent(({ type, detail }) => {
      if (type === EventType.PRESS) {
        // Navigate to CheckIn screen when notification is tapped
        if (navigationRef.isReady()) {
          navigationRef.navigate('Tabs' as never, { screen: 'CheckIn' } as never);
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

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
    <NavigationContainer ref={navigationRef}>
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
