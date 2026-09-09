import AsyncStorage from '@react-native-async-storage/async-storage';
import { preferencesStorage } from './preferencesStorage';

describe('preferencesStorage', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('returns null when no theme mode has been saved yet', async () => {
    await expect(preferencesStorage.getThemeMode()).resolves.toBeNull();
  });

  it('persists and retrieves the saved theme mode', async () => {
    await preferencesStorage.saveThemeMode('dark');
    await expect(preferencesStorage.getThemeMode()).resolves.toBe('dark');
  });
});
