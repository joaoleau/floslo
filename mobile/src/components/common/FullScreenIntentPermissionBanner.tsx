import { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Application from 'expo-application';
import * as IntentLauncher from 'expo-intent-launcher';

import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { useThemeColors } from '@/hooks/useThemeColors';
import { preferencesStorage } from '@/storage/preferencesStorage';

// Android 14+ (API 34) added a separate, app-op-level gate for full-screen alarm intents on
// top of the normal USE_FULL_SCREEN_INTENT manifest permission — confirmed on-device via
// `adb shell appops get <pkg> USE_FULL_SCREEN_INTENT`, which showed `deny` even though the
// manifest permission itself read as granted. Without this granted, an alarm firing while the
// device is locked silently falls back to a normal notification (vibrates, shows in the tray)
// instead of launching the firing screen — there is no OS-level prompt for this, only a
// dedicated settings screen the user has to be sent to manually.
const MIN_SDK_FOR_FULL_SCREEN_INTENT_SETTING = 34;

export function FullScreenIntentPermissionBanner() {
  const colors = useThemeColors();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'android' || Platform.Version < MIN_SDK_FOR_FULL_SCREEN_INTENT_SETTING) {
      return;
    }
    preferencesStorage.getFullScreenIntentBannerDismissed().then((dismissed) => {
      setVisible(!dismissed);
    });
  }, []);

  async function handleOpenSettings() {
    try {
      await IntentLauncher.startActivityAsync(
        IntentLauncher.ActivityAction.MANAGE_APP_USE_FULL_SCREEN_INTENT,
        { data: `package:${Application.applicationId}` }
      );
    } catch (err) {
      console.error('[FullScreenIntentPermissionBanner] Falha ao abrir configurações de tela cheia', err);
    }
  }

  function handleDismiss() {
    setVisible(false);
    preferencesStorage.setFullScreenIntentBannerDismissed(true);
  }

  if (Platform.OS !== 'android' || !visible) return null;

  return (
    <Card className="mb-3 gap-3 rounded-2xl border border-primary/30 bg-accent p-4">
      <View className="flex-row items-start gap-3">
        <View className="h-9 w-9 items-center justify-center rounded-full bg-primary/15">
          <Ionicons name="alarm-outline" size={18} color={colors.primary} />
        </View>
        <View className="flex-1 gap-1">
          <Text className="font-semibold text-accent-foreground">Permissão pendente</Text>
          <Text className="text-sm text-accent-foreground">
            Para o alarme abrir a tela sozinho mesmo com o celular travado, ative &quot;Tela cheia
            para este app&quot; nas configurações do Android.
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
