import { act, renderHook } from '@testing-library/react-native';
import { Platform, Vibration } from 'react-native';

const mockPlayer = { loop: false, play: jest.fn(), pause: jest.fn() };
jest.mock('expo-audio', () => ({ useAudioPlayer: () => mockPlayer }));
jest.mock('expo-application', () => ({ applicationId: 'com.floslo.mobile' }));
jest.mock('@notifee/react-native', () => ({
  __esModule: true,
  default: { cancelDisplayedNotification: jest.fn().mockResolvedValue(undefined) },
}));
jest.mock('@/services/schedulerService', () => ({ schedulerService: { showRingingAlarm: jest.fn() } }));

import { useRingingAlarm, VIBRATION_PAUSE_SECONDS } from './useRingingAlarm';
import { AlarmSettings } from '@/storage/alarmSettingsStorage';

const settings: AlarmSettings = { schedulerId: 's1', name: 'Estudo', alarmSound: 'chic_pop', vibration: true, soundEnabled: true };

describe('useRingingAlarm vibration pause', () => {
  let vibrate: jest.SpyInstance;
  let cancel: jest.SpyInstance;

  beforeEach(() => {
    // O alarme só toca e vibra no Android; o ambiente de teste simula iOS por padrão.
    jest.replaceProperty(Platform, 'OS', 'android');
    jest.useFakeTimers();
    vibrate = jest.spyOn(Vibration, 'vibrate').mockImplementation(() => undefined);
    cancel = jest.spyOn(Vibration, 'cancel').mockImplementation(() => undefined);
    mockPlayer.play.mockClear();
    mockPlayer.pause.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('stops vibrating for 60 seconds and then vibrates again, without touching the sound', async () => {
    const { result, unmount } = await renderHook(() => useRingingAlarm(settings, 's1__monday'));
    expect(result.current.canPauseVibration).toBe(true);
    expect(vibrate).toHaveBeenCalledTimes(1);

    await act(async () => result.current.pauseVibration());
    expect(cancel).toHaveBeenCalled();
    expect(result.current.vibrationPauseCountdown).toBe(VIBRATION_PAUSE_SECONDS);
    expect(mockPlayer.pause).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime((VIBRATION_PAUSE_SECONDS - 1) * 1000);
    });
    expect(vibrate).toHaveBeenCalledTimes(1);

    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    expect(result.current.vibrationPauseCountdown).toBe(0);
    expect(vibrate).toHaveBeenCalledTimes(2);
    await unmount();
  });

  it('does not offer the pause when the scheduler does not vibrate', async () => {
    vibrate.mockClear();
    const { result, unmount } = await renderHook(() => useRingingAlarm({ ...settings, vibration: false }, 's1'));
    expect(result.current.canPauseVibration).toBe(false);
    expect(vibrate).not.toHaveBeenCalled();
    await unmount();
  });
});
