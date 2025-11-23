import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
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

const CustomTabBar = ({ state, descriptors, navigation }: any) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.tabBar, { backgroundColor: theme.colors.tabBarBackground, borderTopColor: theme.colors.border }]}>
      {state.routes.map((route: any, index: number) => {
        const { options } = descriptors[route.key];
        const label = options.tabBarLabel;
        const icon = options.tabBarIcon;

        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <React.Fragment key={route.key}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              testID={options.tabBarTestID}
              onPress={onPress}
              style={styles.tabItem}
            >
              {icon({ color: isFocused ? theme.colors.primary : theme.colors.tabBarInactive })}
              {typeof label === 'string' && (
                <Text style={[styles.labelText, { color: isFocused ? theme.colors.primary : theme.colors.tabBarInactive }]}>
                  {label}
                </Text>
              )}
            </TouchableOpacity>
            {index < state.routes.length - 1 && (
              <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
};

const TabNavigator = () => {
  const { theme } = useTheme();

  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.tabBarInactive,
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

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    height: 88,
    borderTopWidth: 1,
    paddingTop: 12,
    paddingBottom: 12,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelText: {
    fontSize: 9,
    fontWeight: '600',
    marginTop: 4,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  divider: {
    width: 1,
    height: 40,
    alignSelf: 'center',
    opacity: 0.6,
  },
});
