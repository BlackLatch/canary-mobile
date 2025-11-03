/**
 * Minimal Test App
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

function App() {
  console.log('Test App: Rendering');

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Hello Canary!</Text>
      <Text style={styles.subtext}>Test App is Working</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E53935',
  },
  text: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtext: {
    fontSize: 16,
    color: '#FFFFFF',
  },
});

export default App;
