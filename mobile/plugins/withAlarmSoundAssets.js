const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

// Alarm sound files must live as Android raw resources (referenced by notifee via
// `android.resource://<package>/raw/<name>`), which Metro's JS asset pipeline can't
// produce — there's no `require()` for them. `expo prebuild --clean` wipes
// android/app/src/main/res/raw entirely, so this restores the files every time from
// the tracked source of truth at assets/sounds/.
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
