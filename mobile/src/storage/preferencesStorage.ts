import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_MODE_KEY = 'floslo_theme_mode';
const LANGUAGE_KEY = 'floslo_language';

export const preferencesStorage = {
  async getThemeMode(): Promise<string | null> {
    return AsyncStorage.getItem(THEME_MODE_KEY);
  },

  async saveThemeMode(mode: string): Promise<void> {
    await AsyncStorage.setItem(THEME_MODE_KEY, mode);
  },

  async getLanguage(): Promise<string | null> {
    return AsyncStorage.getItem(LANGUAGE_KEY);
  },

  async saveLanguage(language: string): Promise<void> {
    await AsyncStorage.setItem(LANGUAGE_KEY, language);
  },
};
