import { useEffect, useState } from 'react';
import { Modal, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { fieldHelpService, FieldHelpOptions } from '@/services/fieldHelpService';
import { useThemeColors } from '@/hooks/useThemeColors';

// Montado uma vez em app/_layout.tsx, igual ao AppAlert -- mas com um ícone bem menor
// (não o círculo grande do AppAlert, pensado pra um aviso/confirmação, não pra uma
// explicação de campo). Mesmo padrão de centralização do AppAlert/EmptyState: título e
// texto centralizados, não alinhados à esquerda (texto curto alinhado à esquerda dentro
// de um card estreito sobra espaço vazio do lado direito, fica com cara de erro de
// layout). O botão de fechar é o componente <Button> de verdade, o mesmo do resto do app.
export function FieldHelpModal() {
  const colors = useThemeColors();
  const { t } = useTranslation();
  const [options, setOptions] = useState<FieldHelpOptions | null>(null);

  useEffect(() => fieldHelpService.subscribe(setOptions), []);

  if (!options) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => setOptions(null)}>
      <View className="flex-1 items-center justify-center bg-black/50 px-6">
        <Card className="w-full gap-4 rounded-3xl p-5" style={{ maxWidth: 340 }}>
          <View className="items-center gap-2.5">
            <View
              className="h-8 w-8 items-center justify-center rounded-full"
              style={{ backgroundColor: `${colors.brand}1F` }}
            >
              <Ionicons name="help" size={16} color={colors.brand} />
            </View>
            <Text className="text-center text-base font-semibold text-foreground">{options.title}</Text>
          </View>

          <Text className="text-center text-sm leading-5 text-muted-foreground">{options.description}</Text>

          <Button onPress={() => setOptions(null)} className="rounded-3xl bg-brand-100">
            <Text className="font-semibold text-white">{t('common.understood')}</Text>
          </Button>
        </Card>
      </View>
    </Modal>
  );
}
