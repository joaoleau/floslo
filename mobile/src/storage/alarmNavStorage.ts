import AsyncStorage from '@react-native-async-storage/async-storage';

const PENDING_ALARM_NAV_KEY = 'floslo_pending_alarm_nav';
const MAX_AGE_MS = 5 * 60 * 1000;

interface PendingAlarmNav {
  schedulerId: string;
  notificationId: string;
  challengeType?: string;
}

/**
 * A notification tap while the app is merely backgrounded (not killed) is delivered to
 * notifee's onBackgroundEvent, which runs headless with no router mounted — it can't
 * navigate directly. The alarm notification is ongoing and is not auto-cancelled, but
 * getInitialNotification()/getDisplayedNotifications() can still miss the tap on some
 * devices. This durable handoff lets the background handler stash the press, so the
 * foreground side can still pick it up on the next AppState-active check.
 */
export const alarmNavStorage = {
  async savePendingAlarmNav(data: PendingAlarmNav): Promise<void> {
    await AsyncStorage.setItem(PENDING_ALARM_NAV_KEY, JSON.stringify({ ...data, savedAt: Date.now() }));
  },

  // Descarta o toque guardado. A tela de disparo chama isso ao abrir, venha de onde vier: o
  // toque já foi atendido, e se ficasse guardado reabriria o mesmo alarme na próxima volta ao
  // primeiro plano, mesmo depois de os desafios terem sido respondidos.
  async clearPendingAlarmNav(): Promise<void> {
    await AsyncStorage.removeItem(PENDING_ALARM_NAV_KEY);
  },

  async takePendingAlarmNav(): Promise<PendingAlarmNav | null> {
    const raw = await AsyncStorage.getItem(PENDING_ALARM_NAV_KEY);
    if (!raw) return null;
    await AsyncStorage.removeItem(PENDING_ALARM_NAV_KEY);

    try {
      const parsed = JSON.parse(raw) as PendingAlarmNav & { savedAt: number };
      if (Date.now() - parsed.savedAt > MAX_AGE_MS) return null;
      return { schedulerId: parsed.schedulerId, notificationId: parsed.notificationId, challengeType: parsed.challengeType };
    } catch (err) {
      console.warn('[alarmNavStorage] Falha ao ler navegação pendente, descartando', err);
      return null;
    }
  },
};
