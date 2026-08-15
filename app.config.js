const fs = require('fs');
const path = require('path');

const { expo } = require('./app.json');

const loadEnv = () => {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;

  for (const rawLine of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const separatorIndex = line.indexOf('=');
    if (separatorIndex < 0) continue;

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '');
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
};

loadEnv();

const androidAppId = process.env.ADMOB_ANDROID_APP_ID || 'ca-app-pub-3940256099942544~3347511713';
const iosAppId = process.env.ADMOB_IOS_APP_ID || 'ca-app-pub-3940256099942544~1458002511';

module.exports = {
  expo: {
    ...expo,
    plugins: [
      ...(expo.plugins || []).filter((plugin) => {
        const pluginName = Array.isArray(plugin) ? plugin[0] : plugin;
        return pluginName !== 'react-native-google-mobile-ads';
      }),
      [
        'react-native-google-mobile-ads',
        {
          androidAppId,
          iosAppId,
        },
      ],
    ],
  },
};
