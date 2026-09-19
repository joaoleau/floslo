import { useCallback, useState } from 'react';
import { Platform, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import notifee, { AndroidNotificationSetting } from '@notifee/react-native';

import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { useThemeColors } from '@/hooks/useThemeColors';

// "Alarmes e lembretes" (SCHEDULE_EXACT_ALARM) é a permissão que efetivamente faz o alarme
// disparar na hora certa -- diferente de "sobre outros apps"/"tela cheia" (sem API pra checar
// o estado real, só dava pra confiar num "já ativei" auto-declarado do usuário), o notifee expõe
// o estado de verdade via getNotificationSettings().android.alarm. Por isso reconferimos toda
// vez que a tela ganha foco (ex.: voltando das configurações do Android) em vez de guardar um
// dismiss permanente -- o banner some sozinho quando a permissão realmente for concedida.
export function AlarmPermissionBanner() {
  const colors = useThemeColors();
  const [needsPermission, setNeedsPermission] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== 'android') return;

      let cancelled = false;
      notifee
        .getNotificationSettings()
        .then((settings) => {
          if (cancelled) return;
          setNeedsPermission(settings.android.alarm === AndroidNotificationSetting.DISABLED);
        })
        .catch((err) => {
          console.warn('[AlarmPermissionBanner] Falha ao checar permissão de alarme', err);
        });

      return () => {
        cancelled = true;
      };
    }, [])
  );

  async function handleOpenSettings() {
    try {
      await notifee.openAlarmPermissionSettings();
    } catch (err) {
      console.error('[AlarmPermissionBanner] Falha ao abrir configurações de alarme', err);
    }
  }

  if (Platform.OS !== 'android' || !needsPermission) return null;

  return (
    <Card className="mb-3 gap-3 rounded-2xl border border-primary/30 bg-accent p-4">
      <View className="flex-row items-start gap-3">
        <View className="h-9 w-9 items-center justify-center rounded-full bg-primary/15">
          <Ionicons name="alarm-outline" size={18} color={colors.primary} />
        </View>
        <View className="flex-1 gap-1">
          <Text className="font-semibold text-accent-foreground">Permissão necessária</Text>
          <Text className="text-sm text-accent-foreground">
            Sem &quot;Alarmes e lembretes&quot; ativado, seus agendadores podem não disparar na hora
            certa. Ative essa permissão para o Floslo nas configurações do Android.
          </Text>
        </View>
      </View>

      <Button onPress={handleOpenSettings} className="rounded-3xl bg-primary">
        <Text className="font-semibold text-primary-foreground">Ativar agora</Text>
      </Button>
    </Card>
  );
}
