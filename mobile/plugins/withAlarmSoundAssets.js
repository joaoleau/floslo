const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withAlarmSoundAssets(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const sourceDir = path.join(config.modRequest.projectRoot, 'assets', 'sounds');
      const rawDir = path.join(
        config.modRequest.platformProjectRoot,
        'app',
        'src',
        'main',
        'res',
        'raw',
      );

      if (!fs.existsSync(sourceDir)) {
        return config;
      }

      fs.mkdirSync(rawDir, { recursive: true });

      for (const file of fs.readdirSync(sourceDir)) {
        if (file.endsWith('.mp3')) {
          fs.copyFileSync(path.join(sourceDir, file), path.join(rawDir, file));
        }
      }

      return config;
    },
  ]);
};
