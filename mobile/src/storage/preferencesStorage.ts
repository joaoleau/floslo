import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_MODE_KEY = 'floslo_theme_mode';

export const preferencesStorage = {
  async getThemeMode(): Promise<string | null> {
    return AsyncStorage.getItem(THEME_MODE_KEY);
  },

  async saveThemeMode(mode: string): Promise<void> {
    await AsyncStorage.setItem(THEME_MODE_KEY, mode);
  },
};
