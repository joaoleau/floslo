const mockResyncAll = jest.fn();
jest.mock('@/services/schedulerService', () => ({
  schedulerService: { resyncAll: (...args: unknown[]) => mockResyncAll(...args) },
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { sessionService } from './sessionService';
import { onboardingStorage } from '@/storage/onboardingStorage';

describe('sessionService.start', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    mockResyncAll.mockReset().mockResolvedValue(undefined);
  });

  it('sends a new account to the onboarding right after signing up or in', async () => {
    await expect(sessionService.start()).resolves.toBe('/onboarding');
  });

  it('goes straight to the tabs once the onboarding was seen', async () => {
    await onboardingStorage.markOnboardingSeen();
    await expect(sessionService.start()).resolves.toBe('/(tabs)');
  });

  it('schedules the alarms of the account every time a session starts', async () => {
    await sessionService.start();
    expect(mockResyncAll).toHaveBeenCalledTimes(1);
  });

  it('still lets the student in when the alarms fail to sync', async () => {
    mockResyncAll.mockRejectedValue(new Error('offline'));
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);

    await expect(sessionService.start()).resolves.toBe('/onboarding');
  });
});
