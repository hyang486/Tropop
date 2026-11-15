const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Web only: swap native-only modules for stubs. Native resolution is untouched.
const webStubs = {
  'expo-notifications': path.resolve(__dirname, 'src/web-stubs/expo-notifications.ts'),
  'expo-symbols': path.resolve(__dirname, 'src/web-stubs/expo-symbols.tsx'),
  'expo-maps': path.resolve(__dirname, 'src/web-stubs/expo-maps.tsx'),
  'expo-file-system': path.resolve(__dirname, 'src/web-stubs/expo-file-system.ts'),
  '@expo/ui/swift-ui': path.resolve(__dirname, 'src/web-stubs/expo-ui-swift-ui.tsx'),
  '@expo/ui/swift-ui/modifiers': path.resolve(__dirname, 'src/web-stubs/expo-ui-modifiers.ts'),
};
const upstream = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && webStubs[moduleName]) {
    return { type: 'sourceFile', filePath: webStubs[moduleName] };
  }
  return (upstream ?? context.resolveRequest)(context, moduleName, platform);
};

module.exports = config;
