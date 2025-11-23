import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/Feather';
import { useTheme } from '../contexts/ThemeContext';
import { CheckInScreen } from '../screens/CheckInScreen';
import { DossiersScreen } from '../screens/DossiersScreen';
import { GuardScreen } from '../screens/GuardScreen';
import { MonitorScreen } from '../screens/MonitorScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { CreateDossierScreen } from '../screens/CreateDossierScreen';
import { DossierDetailScreen } from '../screens/DossierDetailScreen';
import { DecryptionProgressScreen } from '../screens/DecryptionProgressScreen';
import { DossierCreationProgressScreen } from '../screens/DossierCreationProgressScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const TabNavigator = () => {
  const { theme } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.tabBarInactive,
        tabBarStyle: {
          backgroundColor: theme.colors.tabBarBackground,
          borderTopColor: theme.colors.border,
          borderTopWidth: 1,
          paddingTop: 12,
          paddingBottom: 12,
          height: 88,
        },
        tabBarLabelStyle: {
          fontSize: 9,
          fontWeight: '600',
          marginTop: 4,
          letterSpacing: 0.5,
          textTransform: 'uppercase',
        },
      }}
    >
      <Tab.Screen
        name="CheckIn"
        component={CheckInScreen}
        options={{
          tabBarLabel: 'Check In',
          tabBarIcon: ({ color }) => (
            <Icon name="heart" size={20} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Dossiers"
        component={DossiersScreen}
        options={{
          tabBarLabel: 'Dossiers',
          tabBarIcon: ({ color }) => (
            <Icon name="folder" size={20} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Guard"
        component={GuardScreen}
        options={{
          tabBarLabel: 'Guard',
          tabBarIcon: ({ color }) => (
            <Icon name="shield" size={20} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Monitor"
        component={MonitorScreen}
        options={{
          tabBarLabel: 'Receive',
          tabBarIcon: ({ color }) => (
            <Icon name="inbox" size={20} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Settings',
          tabBarIcon: ({ color }) => (
            <Icon name="settings" size={20} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export const AppNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Tabs" component={TabNavigator} />
      <Stack.Screen
        name="CreateDossier"
        component={CreateDossierScreen}
        options={{
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="DossierDetail"
        component={DossierDetailScreen}
        options={{
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="DecryptionProgress"
        component={DecryptionProgressScreen}
        options={{
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="DossierCreationProgress"
        component={DossierCreationProgressScreen}
        options={{
          presentation: 'card',
          gestureEnabled: false,
        }}
      />
    </Stack.Navigator>
  );
};
