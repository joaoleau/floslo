import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { i18n } from '@/i18n';
import { schedulerService } from '@/services/schedulerService';
import { useLanguagePreference } from './useLanguagePreference';

jest.mock('@/services/schedulerService', () => ({
  schedulerService: { resyncAll: jest.fn(() => Promise.resolve()) },
}));

afterEach(async () => {
  await AsyncStorage.clear();
  await i18n.changeLanguage('pt');
  jest.clearAllMocks();
});

describe('useLanguagePreference', () => {
  it('starts on automatic when nothing was saved', async () => {
    const { result } = await renderHook(() => useLanguagePreference());
    expect(result.current.preference).toBe('system');
  });

  it('applies and saves the chosen language, and reschedules the alarms so the notification follows it', async () => {
    const { result } = await renderHook(() => useLanguagePreference());

    await act(async () => {
      await result.current.setPreference('en');
    });

    expect(result.current.preference).toBe('en');
    expect(i18n.language).toBe('en');
    expect(await AsyncStorage.getItem('floslo_language')).toBe('en');
    expect(schedulerService.resyncAll).toHaveBeenCalled();
  });

  it('reads the saved preference', async () => {
    await AsyncStorage.setItem('floslo_language', 'en');
    const { result } = await renderHook(() => useLanguagePreference());
    await waitFor(() => expect(result.current.preference).toBe('en'));
  });
});
