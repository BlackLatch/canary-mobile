/**
 * @format
 */

// Polyfills for crypto and Node.js APIs
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import { Buffer } from '@craftzdog/react-native-buffer';
global.Buffer = Buffer;

// Add base64 conversion functions for react-native-quick-crypto
// Use a simple base64 implementation to avoid circular references
const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const lookup = new Uint8Array(256);
for (let i = 0; i < chars.length; i++) {
  lookup[chars.charCodeAt(i)] = i;
}

global.base64FromArrayBuffer = (arrayBuffer) => {
  const bytes = new Uint8Array(arrayBuffer);
  let result = '';
  for (let i = 0; i < bytes.length; i += 3) {
    result += chars[bytes[i] >> 2];
    result += chars[((bytes[i] & 3) << 4) | (bytes[i + 1] >> 4)];
    result += chars[((bytes[i + 1] & 15) << 2) | (bytes[i + 2] >> 6)];
    result += chars[bytes[i + 2] & 63];
  }
  const mod = bytes.length % 3;
  if (mod === 1) {
    result = result.substring(0, result.length - 2) + '==';
  } else if (mod === 2) {
    result = result.substring(0, result.length - 1) + '=';
  }
  return result;
};

global.base64ToArrayBuffer = (base64) => {
  let len = base64.length;
  if (base64[len - 2] === '=') len -= 2;
  else if (base64[len - 1] === '=') len -= 1;

  const bytes = new Uint8Array((len * 3) / 4);
  let p = 0;

  for (let i = 0; i < len; i += 4) {
    const encoded1 = lookup[base64.charCodeAt(i)];
    const encoded2 = lookup[base64.charCodeAt(i + 1)];
    const encoded3 = lookup[base64.charCodeAt(i + 2)];
    const encoded4 = lookup[base64.charCodeAt(i + 3)];

    bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
    bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
    bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
  }

  return bytes.buffer.slice(0, p);
};

// Install react-native-quick-crypto for native crypto operations
import { install } from 'react-native-quick-crypto';
install();

// Enable react-native-screens
import { enableScreens } from 'react-native-screens';
enableScreens();

// Setup background notification event handler
import notifee, { EventType } from '@notifee/react-native';

notifee.onBackgroundEvent(async ({ type, detail }) => {
  const { notification, pressAction } = detail;

  // Handle notification press
  if (type === EventType.PRESS) {
    // Notification was tapped - app will open automatically
    // Navigation will be handled by foreground event handler in App.tsx
  }
});

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
