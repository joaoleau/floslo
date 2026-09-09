// Official mock recommended by @react-native-async-storage/async-storage for Jest --
// without it, anything that transitively imports the real native module (e.g. via
// ThemeProvider -> preferencesStorage) throws "NativeModule: AsyncStorage is null."
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
