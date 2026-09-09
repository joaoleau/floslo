import { useEffect, useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { alertService, AppAlertButton, AppAlertOptions } from '@/services/alertService';
import { useThemeColors } from '@/hooks/useThemeColors';

// Montado uma vez em app/_layout.tsx, escuta o alertService e desenha o popup no lugar
// do Alert.alert nativo -- mesmo Card arredondado/cores do resto do app, em vez do
// diálogo cinza do sistema. Ícone e cor mudam conforme tem botão destrutivo entre os
// passados ou não, pra dar um sinal visual do tipo de aviso antes mesmo de ler o texto.
export function AppAlert() {
  const colors = useThemeColors();
  const [options, setOptions] = useState<AppAlertOptions | null>(null);

  useEffect(() => alertService.subscribe(setOptions), []);

  if (!options) return null;

  const buttons: AppAlertButton[] = options.buttons?.length ? options.buttons : [{ text: 'OK' }];
  const isDestructive = buttons.some((button) => button.style === 'destructive');
  const accentColor = isDestructive ? '#EF4444' : colors.brand;

  function handlePress(button: AppAlertButton) {
    setOptions(null);
    button.onPress?.();
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => setOptions(null)}>
      <View className="flex-1 items-center justify-center bg-black/50 px-6">
        <Card className="w-full gap-5 rounded-3xl p-6" style={{ maxWidth: 340 }}>
          <View className="items-center gap-3">
            <View
              className="h-14 w-14 items-center justify-center rounded-full"
              style={{ backgroundColor: `${accentColor}1F` }}
            >
              <Ionicons
                name={isDestructive ? 'alert-circle' : 'information-circle'}
                size={30}
                color={accentColor}
              />
            </View>

            <Text className="text-center text-lg font-bold text-foreground">{options.title}</Text>

            {!!options.message && (
              <Text className="text-center text-muted-foreground">{options.message}</Text>
            )}
          </View>

          <View className={buttons.length > 2 ? 'gap-2' : 'flex-row gap-3'}>
            {buttons.map((button, index) => {
              const isCancel = button.style === 'cancel';
              const isButtonDestructive = button.style === 'destructive';

              return (
                <Pressable
                  key={index}
                  onPress={() => handlePress(button)}
                  className={`flex-1 items-center justify-center rounded-full py-3 ${
                    isButtonDestructive ? 'bg-red-600' : isCancel ? 'bg-secondary' : 'bg-brand-100'
                  }`}
                >
                  <Text className={`font-semibold ${isCancel ? 'text-foreground' : 'text-white'}`}>
                    {button.text}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Card>
      </View>
    </Modal>
  );
}
