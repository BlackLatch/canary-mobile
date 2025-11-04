import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/Feather';
import { useTheme } from '../contexts/ThemeContext';
import { CheckInScreen } from '../screens/CheckInScreen';
import { DossiersScreen } from '../screens/DossiersScreen';
import { MonitorScreen } from '../screens/MonitorScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { CreateDossierScreen } from '../screens/CreateDossierScreen';
import { DossierDetailScreen } from '../screens/DossierDetailScreen';

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
          paddingTop: 8,
          paddingBottom: 8,
          height: 88,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 4,
          letterSpacing: 1,
          textTransform: 'uppercase',
        },
      }}
    >
      <Tab.Screen
        name="CheckIn"
        component={CheckInScreen}
        options={{
          tabBarLabel: 'Check In',
          tabBarIcon: ({ color, size }) => (
            <Icon name="check-circle" size={size - 2} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Dossiers"
        component={DossiersScreen}
        options={{
          tabBarLabel: 'Dossiers',
          tabBarIcon: ({ color, size }) => (
            <Icon name="folder" size={size - 2} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Monitor"
        component={MonitorScreen}
        options={{
          tabBarLabel: 'Monitor',
          tabBarIcon: ({ color, size }) => (
            <Icon name="activity" size={size - 2} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <Icon name="settings" size={size - 2} color={color} />
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
    </Stack.Navigator>
  );
};
