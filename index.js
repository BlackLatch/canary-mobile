/**
 * @format
 */

// Polyfills for crypto and Node.js APIs
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import { Buffer } from 'buffer';
global.Buffer = Buffer;

// Install react-native-quick-crypto for native crypto operations
import { install } from 'react-native-quick-crypto';
install();

// Enable react-native-screens
import { enableScreens } from 'react-native-screens';
enableScreens();

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
