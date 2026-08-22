const { withProjectBuildGradle } = require('@expo/config-plugins');

// @notifee/react-native ships its native sound/vibration assets as a local Maven repo
// instead of publishing to a public one. It has no Expo config plugin of its own, so
// without this, `expo prebuild --clean` regenerates android/build.gradle from scratch
// and silently drops this line, breaking the native Android build.
const NOTIFEE_MAVEN_LINE =
  'maven { url "$rootDir/../node_modules/@notifee/react-native/android/libs" }';

module.exports = function withNotifeeGradleRepo(config) {
  return withProjectBuildGradle(config, (config) => {
    if (config.modResults.contents.includes(NOTIFEE_MAVEN_LINE)) {
      return config;
    }

    const anchor = /allprojects\s*{\s*repositories\s*{/;
    if (!anchor.test(config.modResults.contents)) {
      throw new Error(
        '[withNotifeeGradleRepo] Could not find `allprojects { repositories { ... } }` in android/build.gradle to insert the notifee maven repo into.',
      );
    }

    config.modResults.contents = config.modResults.contents.replace(
      anchor,
      (match) => `${match}\n    ${NOTIFEE_MAVEN_LINE}`,
    );

    return config;
  });
};
