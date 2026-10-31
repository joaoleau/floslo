import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_PREFIX = 'floslo_alarm_settings_';

export interface AlarmSettings {
  schedulerId: string;
  name: string;
  alarmSound: string;
  vibration: boolean;
  soundEnabled: boolean;
}

export const alarmSettingsStorage = {
  async save(settings: AlarmSettings): Promise<void> {
    await AsyncStorage.setItem(KEY_PREFIX + settings.schedulerId, JSON.stringify(settings));
  },

  async get(schedulerId: string): Promise<AlarmSettings | null> {
    const raw = await AsyncStorage.getItem(KEY_PREFIX + schedulerId);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AlarmSettings;
    } catch (err) {
      console.warn('[alarmSettingsStorage] Falha ao ler os ajustes do alarme, ignorando', err);
      return null;
    }
  },

  async remove(schedulerId: string): Promise<void> {
    await AsyncStorage.removeItem(KEY_PREFIX + schedulerId);
  },
};
