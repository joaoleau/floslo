const { withProjectBuildGradle } = require('@expo/config-plugins');

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
