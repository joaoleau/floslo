import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo';

interface AlarmScreenNativeModule {
  canUseFullScreenIntent(): boolean;
  openFullScreenIntentSettings(): void;
  setShowOverLockScreen(enabled: boolean): Promise<void>;
}

const native = Platform.OS === 'android' ? requireOptionalNativeModule<AlarmScreenNativeModule>('AlarmScreen') : null;

export const alarmScreen = {
  canUseFullScreenIntent(): boolean {
    return native ? native.canUseFullScreenIntent() : true;
  },

  openFullScreenIntentSettings(): void {
    native?.openFullScreenIntentSettings();
  },

  async setShowOverLockScreen(enabled: boolean): Promise<void> {
    await native?.setShowOverLockScreen(enabled);
  },
};
