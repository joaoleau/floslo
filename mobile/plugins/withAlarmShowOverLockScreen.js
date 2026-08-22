const { withAndroidManifest } = require('@expo/config-plugins');

// Required by notifee's official Android full-screen-intent setup (see
// https://notifee.app/react-native/docs/android/behaviour#full-screen-action): without these
// two attributes on the launcher activity, Android launches the Activity when a full-screen
// notification fires while the device is locked, but immediately transitions it to the
// "stopped" state instead of showing it over the keyguard -- the notification still appears
// and vibrates, but the alarm screen never actually shows up until the user manually unlocks
// and taps it. `expo prebuild` regenerates AndroidManifest.xml from scratch, so this has to be
// a config plugin (not a one-off manual edit) to survive that.
module.exports = function withAlarmShowOverLockScreen(config) {
  return withAndroidManifest(config, (config) => {
    const application = config.modResults.manifest.application?.[0];
    const mainActivity = application?.activity?.find(
      (activity) => activity.$?.['android:name'] === '.MainActivity'
    );

    if (mainActivity) {
      mainActivity.$['android:showWhenLocked'] = 'true';
      mainActivity.$['android:turnScreenOn'] = 'true';
    }

    return config;
  });
};
