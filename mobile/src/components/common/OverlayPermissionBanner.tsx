import { useEffect, useState } from 'react';
import { Linking, Platform, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { useThemeColors } from '@/hooks/useThemeColors';
import { preferencesStorage } from '@/storage/preferencesStorage';

// Android never shows a runtime prompt for "display over other apps" — it's a special,
// manually-toggled permission. Without it, some devices silently downgrade the alarm's
// full-screen intent to a normal notification while the app is backgrounded/locked, so
// we guide the user to the settings screen ourselves instead of relying on Android to ask.
export function OverlayPermissionBanner() {
  const colors = useThemeColors();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    preferencesStorage.getOverlayPermissionBannerDismissed().then((dismissed) => {
      setVisible(!dismissed);
    });
  }, []);

  async function handleOpenSettings() {
    try {
      await Linking.sendIntent('android.settings.action.MANAGE_OVERLAY_PERMISSION');
    } catch (err) {
      console.warn('[OverlayPermissionBanner] Intent específico falhou, abrindo configurações genéricas', err);
      await Linking.openSettings();
    }
  }

  function handleDismiss() {
    setVisible(false);
    preferencesStorage.setOverlayPermissionBannerDismissed(true);
  }

  if (Platform.OS !== 'android' || !visible) return null;

  return (
    <Card className="mb-3 gap-3 rounded-2xl border border-primary/30 bg-accent p-4">
      <View className="flex-row items-start gap-3">
        <View className="h-9 w-9 items-center justify-center rounded-full bg-primary/15">
          <Ionicons name="layers-outline" size={18} color={colors.primary} />
        </View>
        <View className="flex-1 gap-1">
          <Text className="font-semibold text-accent-foreground">Permissão pendente</Text>
          <Text className="text-sm text-accent-foreground">
            Para o alarme travar a tela corretamente, ative &quot;Exibir sobre outros apps&quot; para o
            Floslo nas configurações do Android.
          </Text>
        </View>
      </View>

      <View className="flex-row gap-2">
        <Button onPress={handleOpenSettings} className="flex-1 rounded-full bg-primary">
          <Text className="font-semibold text-primary-foreground">Ativar agora</Text>
        </Button>
        <Button onPress={handleDismiss} variant="outline" className="flex-1 rounded-full">
          <Text className="font-semibold">Já ativei</Text>
        </Button>
      </View>
    </Card>
  );
}
