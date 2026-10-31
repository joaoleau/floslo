// Official mock recommended by @react-native-async-storage/async-storage for Jest --
// without it, anything that transitively imports the real native module (e.g. via
// ThemeProvider -> preferencesStorage) throws "NativeModule: AsyncStorage is null."
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Os testes conferem os textos em português: o i18n é iniciado no idioma do celular (que no
// Jest não é o português), então fixamos o português aqui.
const { i18n } = require('./src/i18n');
i18n.changeLanguage('pt');
