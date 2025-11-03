/**
 * Canary Mobile App
 */

import React from 'react';
import {
  StatusBar,
  useColorScheme,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { WalletProvider } from './src/contexts/WalletContext';
import { DossierProvider } from './src/contexts/DossierContext';
import { AuthenticatedApp } from './src/components/AuthenticatedApp';

console.log('App.tsx: Starting to load');

function App() {
  console.log('App: Rendering');
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <WalletProvider>
        <DossierProvider>
          <AuthenticatedApp />
        </DossierProvider>
      </WalletProvider>
      <Toast />
    </SafeAreaProvider>
  );
}

console.log('App.tsx: Finished loading');

export default App;
