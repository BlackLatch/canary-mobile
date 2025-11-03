const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const path = require('path');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  watchFolders: [
    path.resolve(__dirname, '../nucypher-core/nucypher-core-mobile/react-native'),
  ],
  resolver: {
    extraNodeModules: {
      '@nucypher/taco-mobile': path.resolve(
        __dirname,
        '../nucypher-core/nucypher-core-mobile/react-native'
      ),
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
