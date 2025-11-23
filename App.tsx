/**
 * Canary Mobile App
 */

import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { WalletProvider } from './src/contexts/WalletContext';
import { DossierProvider } from './src/contexts/DossierContext';
import { AuthenticatedApp } from './src/components/AuthenticatedApp';

// console.log('App.tsx: Starting to load');

function AppContent() {
  // console.log('App: Rendering');
  const { theme } = useTheme();

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} />
      <WalletProvider>
        <DossierProvider>
          <AuthenticatedApp />
        </DossierProvider>
      </WalletProvider>
      <Toast />
    </SafeAreaProvider>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

// console.log('App.tsx: Finished loading');

export default App;
