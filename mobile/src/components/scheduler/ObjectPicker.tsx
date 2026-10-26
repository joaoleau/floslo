import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { useTranslation } from 'react-i18next';
import { i18n } from '@/i18n';
import { ObjectType } from '@/types/domain/Object';
import { useThemeColors } from '@/hooks/useThemeColors';

// Por que um documento ainda não pode ser vinculado a um agendador, ou null se pode. Os desafios
// saem da busca pelas tags do documento: sem nenhuma, ele não forneceria conteúdo ao disparo.
export function unavailableReason(object: ObjectType): string | null {
  if (object.status === 'processing') return i18n.t('schedulers.objectPicker.processing');
  if (object.status === 'failed') return i18n.t('schedulers.objectPicker.failed');
  if (object.tags.length === 0) return i18n.t('schedulers.objectPicker.noTags');
  return null;
}

interface ObjectPickerProps {
  objects: ObjectType[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export function ObjectPicker({ objects, selectedIds, onChange }: ObjectPickerProps) {
  const colors = useThemeColors();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const selectedObjects = useMemo(
    () => objects.filter((object) => selectedIds.includes(object.id)),
    [objects, selectedIds],
  );

  const availableObjects = useMemo(
    () => objects.filter((object) => !selectedIds.includes(object.id)),
    [objects, selectedIds],
  );

  function addObject(id: string) {
    onChange([...selectedIds, id]);
    setOpen(false);
  }

  function removeObject(id: string) {
    onChange(selectedIds.filter((item) => item !== id));
  }

  return (
    <View className="gap-3">
      {/* bg-card (não bg-background): esse botão sempre vive dentro de um Card branco --
          bg-background é o fundo da página (ligeiramente mais escuro que branco de propósito,
          pra dar profundidade atrás dos cards), então usá-lo aqui destoava do card ao redor. */}
      <Button variant="outline" className="h-10 rounded-3xl justify-start bg-card" onPress={() => setOpen(true)}>
        <Ionicons name="add-circle-outline" size={18} color={colors.brand} />
        <Text className="ml-2 text-brand-100">{t('schedulers.objectPicker.add')}</Text>
      </Button>

      <View className="flex-row flex-wrap gap-2">
        {selectedObjects.map((object) => (
          <Badge
            key={object.id}
            className="flex-row items-center gap-2 rounded-full bg-brand-100 px-3 py-1"
          >
            <Text className="text-white">{object.name}</Text>

            <Ionicons
              name="close"
              size={16}
              color="white"
              onPress={() => removeObject(object.id)}
            />
          </Badge>
        ))}
      </View>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View className="flex-1 justify-end bg-black/40">
          <Card className="max-h-[70%] rounded-t-3xl p-5 gap-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-lg font-semibold">{t('schedulers.objectPicker.add')}</Text>

              <Ionicons name="close" size={24} color={colors.brand} onPress={() => setOpen(false)} />
            </View>

            <ScrollView>
              {availableObjects.map((object) => {
                const reason = unavailableReason(object);
                return (
                  <Pressable
                    key={object.id}
                    onPress={() => addObject(object.id)}
                    disabled={reason !== null}
                    className="flex-row items-center justify-between border-b border-border py-4"
                    style={{ opacity: reason ? 0.5 : 1 }}
                  >
                    <View className="flex-1 pr-3">
                      <Text>{object.name}</Text>
                      {reason && <Text className="text-xs text-muted-foreground">{reason}</Text>}
                    </View>

                    {!reason && <Ionicons name="add-circle-outline" size={20} color={colors.brand} />}
                  </Pressable>
                );
              })}

              {availableObjects.length === 0 && (
                <Text className="py-8 text-center text-muted-foreground">
                  {objects.length === 0
                    ? t('schedulers.objectPicker.none')
                    : t('schedulers.objectPicker.allAdded')}
                </Text>
              )}
            </ScrollView>
          </Card>
        </View>
      </Modal>
    </View>
  );
}
