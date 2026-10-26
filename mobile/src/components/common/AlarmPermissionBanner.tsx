import { useCallback, useEffect, useState } from 'react';
import { AppState, Platform, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import notifee, { AndroidNotificationSetting } from '@notifee/react-native';

import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { useThemeColors } from '@/hooks/useThemeColors';
import { alarmScreen } from '../../../modules/alarm-screen';

interface MissingPermission {
  key: 'exactAlarm' | 'fullScreen';
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  description: string;
  open: () => Promise<void> | void;
}

const EXACT_ALARM: MissingPermission = {
  key: 'exactAlarm',
  icon: 'alarm-outline',
  title: 'Permissão necessária',
  description:
    'Sem "Alarmes e lembretes" ativado, seus agendadores podem não disparar na hora certa. Ative essa permissão para o Floslo nas configurações do Android.',
  open: () => notifee.openAlarmPermissionSettings(),
};

const FULL_SCREEN: MissingPermission = {
  key: 'fullScreen',
  icon: 'phone-portrait-outline',
  title: 'Alarme em tela cheia',
  description:
    'Sem "Notificações em tela cheia" ativado, o alarme só aparece como notificação e a tela dos desafios não abre sozinha com o celular bloqueado. Ative essa permissão para o Floslo nas configurações do Android.',
  open: () => alarmScreen.openFullScreenIntentSettings(),
};

// As duas permissões de que o alarme depende no Android. "Alarmes e lembretes"
// (SCHEDULE_EXACT_ALARM) faz o alarme disparar na hora certa, e o notifee expõe o estado dela.
// "Notificações em tela cheia" (USE_FULL_SCREEN_INTENT) faz a tela do alarme abrir sozinha sobre
// o bloqueio; desde o Android 14 ela pode vir desativada, e o estado vem do módulo nativo do
// projeto (modules/alarm-screen). Cada uma que faltar ganha um aviso com o atalho para a
// configuração. Reconferimos ao ganhar foco e ao voltar para o app (por exemplo, das
// configurações do Android), em vez de guardar um dismiss permanente: o aviso some sozinho
// quando a permissão é concedida.
export function AlarmPermissionBanner() {
  const colors = useThemeColors();
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
              <Text className="font-semibold text-accent-foreground">{permission.title}</Text>
              <Text className="text-sm text-accent-foreground">{permission.description}</Text>
            </View>
          </View>

          <Button onPress={() => handleOpenSettings(permission)} className="rounded-3xl bg-primary">
            <Text className="font-semibold text-primary-foreground">Ativar agora</Text>
          </Button>
        </Card>
      ))}
    </View>
  );
}
