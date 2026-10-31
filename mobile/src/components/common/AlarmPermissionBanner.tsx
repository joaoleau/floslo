import { useCallback, useEffect, useState } from 'react';
import { AppState, Platform, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import notifee, { AndroidNotificationSetting } from '@notifee/react-native';

import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { useThemeColors } from '@/hooks/useThemeColors';
import { alarmScreen } from '../../../modules/alarm-screen';

interface MissingPermission {
  key: 'exactAlarm' | 'fullScreen';
  icon: React.ComponentProps<typeof Ionicons>['name'];
  open: () => Promise<void> | void;
}

const EXACT_ALARM: MissingPermission = {
  key: 'exactAlarm',
  icon: 'alarm-outline',
  open: () => notifee.openAlarmPermissionSettings(),
};

const FULL_SCREEN: MissingPermission = {
  key: 'fullScreen',
  icon: 'phone-portrait-outline',
  open: () => alarmScreen.openFullScreenIntentSettings(),
};

export function AlarmPermissionBanner() {
  const colors = useThemeColors();
  const { t } = useTranslation();
  const [missing, setMissing] = useState<MissingPermission[]>([]);

  const check = useCallback(() => {
    if (Platform.OS !== 'android') return;

    notifee
      .getNotificationSettings()
      .then((settings) => {
        const next: MissingPermission[] = [];
        if (settings.android.alarm === AndroidNotificationSetting.DISABLED) next.push(EXACT_ALARM);
        if (!alarmScreen.canUseFullScreenIntent()) next.push(FULL_SCREEN);
        setMissing(next);
      })
      .catch((err) => {
        console.warn('[AlarmPermissionBanner] Falha ao checar as permissões do alarme', err);
      });
  }, []);

  useFocusEffect(check);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') check();
    });
    return () => subscription.remove();
  }, [check]);

  async function handleOpenSettings(permission: MissingPermission) {
    try {
      await permission.open();
    } catch (err) {
      console.error(`[AlarmPermissionBanner] Falha ao abrir as configurações (${permission.key})`, err);
    }
  }

  if (Platform.OS !== 'android' || missing.length === 0) return null;

  return (
    <View>
      {missing.map((permission) => (
        <Card key={permission.key} className="mb-3 gap-3 rounded-2xl border border-primary/30 bg-accent p-4">
          <View className="flex-row items-start gap-3">
            <View className="h-9 w-9 items-center justify-center rounded-full bg-primary/15">
              <Ionicons name={permission.icon} size={18} color={colors.primary} />
            </View>
            <View className="flex-1 gap-1">
              <Text className="font-semibold text-accent-foreground">{t(`permissions.${permission.key}.title`)}</Text>
              <Text className="text-sm text-accent-foreground">{t(`permissions.${permission.key}.description`)}</Text>
            </View>
          </View>

          <Button onPress={() => handleOpenSettings(permission)} className="rounded-3xl bg-primary">
            <Text className="font-semibold text-primary-foreground">{t('permissions.enableNow')}</Text>
          </Button>
        </Card>
      ))}
    </View>
  );
}
