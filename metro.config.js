const { getDefaultConfig } = require('expo/metro-config');
const { withUniwindConfig } = require('uniwind/metro');

const config = getDefaultConfig(__dirname);

// Add .db as an asset extension so SQLite databases are bundled
config.resolver.assetExts = config.resolver.assetExts.filter(ext => ext !== 'db');
config.resolver.assetExts.push('db');

// withUniwindConfig must be the outermost wrapper
module.exports = withUniwindConfig(config, {
  cssEntryFile: './global.css',
  dtsFile: './src/uniwind-types.d.ts',
});
