const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// Find the project and workspace directories
const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Watch all files within the monorepo — preserve Expo defaults, then add monorepo root
config.watchFolders = Array.from(new Set([...(config.watchFolders ?? []), monorepoRoot]));

// 2. Let Metro know where to resolve packages and in what order
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// 3. Force Metro to resolve (sub)dependencies only from the `nodeModulesPaths`.
// Required for monorepo package isolation; expo-doctor will warn about this
// mismatch (suppressed via expo.doctor.metroConfigCheck.enabled in package.json).
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
