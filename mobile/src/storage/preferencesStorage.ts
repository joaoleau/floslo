import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_MODE_KEY = 'floslo_theme_mode';
const OVERLAY_PERMISSION_BANNER_DISMISSED_KEY = 'floslo_overlay_permission_banner_dismissed';
const FULL_SCREEN_INTENT_BANNER_DISMISSED_KEY = 'floslo_full_screen_intent_banner_dismissed';

export const preferencesStorage = {
  async getThemeMode(): Promise<string | null> {
    return AsyncStorage.getItem(THEME_MODE_KEY);
  },

  async saveThemeMode(mode: string): Promise<void> {
    await AsyncStorage.setItem(THEME_MODE_KEY, mode);
  },

  async getOverlayPermissionBannerDismissed(): Promise<boolean> {
    return (await AsyncStorage.getItem(OVERLAY_PERMISSION_BANNER_DISMISSED_KEY)) === 'true';
  },

  async setOverlayPermissionBannerDismissed(dismissed: boolean): Promise<void> {
    await AsyncStorage.setItem(OVERLAY_PERMISSION_BANNER_DISMISSED_KEY, String(dismissed));
  },

  async getFullScreenIntentBannerDismissed(): Promise<boolean> {
    return (await AsyncStorage.getItem(FULL_SCREEN_INTENT_BANNER_DISMISSED_KEY)) === 'true';
  },

  async setFullScreenIntentBannerDismissed(dismissed: boolean): Promise<void> {
    await AsyncStorage.setItem(FULL_SCREEN_INTENT_BANNER_DISMISSED_KEY, String(dismissed));
  },
};
