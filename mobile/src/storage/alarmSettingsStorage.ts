import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_PREFIX = 'floslo_alarm_settings_';

export interface AlarmSettings {
  schedulerId: string;
  name: string;
  alarmSound: string;
  vibration: boolean;
  soundEnabled: boolean;
}

/**
 * Som e vibração de cada agendador, guardados no aparelho quando o alarme é agendado. A tela
 * de disparo precisa deles antes de os desafios chegarem: o alarme toca enquanto os desafios
 * são preparados e também na tela de erro (sem rede, por exemplo), quando o agendador ainda
 * não veio do backend.
 */
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
