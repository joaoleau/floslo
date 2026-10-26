import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo';

interface AlarmScreenNativeModule {
  canUseFullScreenIntent(): boolean;
  openFullScreenIntentSettings(): void;
  setShowOverLockScreen(enabled: boolean): Promise<void>;
}

// Módulo nativo do próprio projeto (modules/alarm-screen/android). Fora do Android, ou num build
// sem ele (testes), as funções viram no-ops seguras.
const native = Platform.OS === 'android' ? requireOptionalNativeModule<AlarmScreenNativeModule>('AlarmScreen') : null;

export const alarmScreen = {
  /** Se o app pode abrir a tela do alarme em tela cheia sozinho (Android 14 ou superior pede permissão). */
  canUseFullScreenIntent(): boolean {
    return native ? native.canUseFullScreenIntent() : true;
  },

  /** Abre a configuração do Android para ativar as notificações em tela cheia do app. */
  openFullScreenIntentSettings(): void {
    native?.openFullScreenIntentSettings();
  },

  /** Mostra (ou deixa de mostrar) o app sobre a tela de bloqueio. */
  async setShowOverLockScreen(enabled: boolean): Promise<void> {
    await native?.setShowOverLockScreen(enabled);
  },
};
