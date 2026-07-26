import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';

interface ObjectItem {
  id: string;
  name: string;
}

interface ObjectPickerProps {
  objects: ObjectItem[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export function ObjectPicker({ objects, selectedIds, onChange }: ObjectPickerProps) {
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
      <Button
        className="h-10 rounded-3xl justify-start border border-bg-brand-100 bg-white"
        onPress={() => setOpen(true)}
      >
        <Ionicons name="add-circle-outline" size={18} color="#33405C" />
        <Text className="ml-2 text-brand-100">Adicionar objeto</Text>
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
              <Text className="text-lg font-semibold">Adicionar objeto</Text>

              <Ionicons name="close" size={24} onPress={() => setOpen(false)} />
            </View>

            <ScrollView>
              {availableObjects.map((object) => (
                <Pressable
                  key={object.id}
                  onPress={() => addObject(object.id)}
                  className="flex-row items-center justify-between border-b border-zinc-200 py-4"
                >
                  <Text>{object.name}</Text>

                  <Ionicons name="add-circle-outline" size={20} color="#33405C" />
                </Pressable>
              ))}

              {availableObjects.length === 0 && (
                <Text className="py-8 text-center text-zinc-500">
                  Todos os objetos já foram adicionados.
                </Text>
              )}
            </ScrollView>
          </Card>
        </View>
      </Modal>
    </View>
  );
}
