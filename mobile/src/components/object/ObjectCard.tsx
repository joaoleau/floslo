import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';

import { ObjectTags } from '@/components/object/ObjectTags';
import { ObjectStatusBadge } from '@/components/object/ObjectStatusBadge';
import { ObjectType } from '@/types/domain/Object';
import { getColorForId } from '@/lib/hashColor';
import { getExtensionColor } from '@/lib/fileExtensionColors';

interface ObjectCardProps {
  object: ObjectType;
  onPress?: () => void;
  onLongPress?: () => void;
  selectionMode?: boolean;
  selected?: boolean;
}

// Mesmo esquema de cor por hash do SchedulerCard (ver getColorForId), pra manter a mesma
// linguagem visual entre as duas listagens. A badge de extensão usa uma cor própria e
// fixa por tipo de arquivo (getExtensionColor) -- independente da cor do card -- pra
// continuar reconhecível item a item.
export function ObjectCard({ object, onPress, onLongPress, selectionMode = false, selected = false }: ObjectCardProps) {
  const backgroundColor = getColorForId(object.id);
  const extensionColor = getExtensionColor(object.extension);

  return (
    <Pressable onPress={onPress} onLongPress={onLongPress}>
      <View
        className="rounded-2xl px-4 py-3.5 gap-2.5"
        style={{
          backgroundColor,
          opacity: selectionMode && !selected ? 0.5 : 1,
          borderWidth: selected ? 3 : 0,
          borderColor: '#FFFFFF',
        }}
      >
        <View className="flex-row items-start justify-between gap-2">
          {selectionMode && (
            <View
              testID="object-card-checkbox"
              className="items-center justify-center rounded-full"
              style={{
                width: 20,
                height: 20,
                backgroundColor: selected ? '#FFFFFF' : 'transparent',
                borderWidth: selected ? 0 : 2,
                borderColor: '#FFFFFF',
              }}
            >
              {selected && <Ionicons name="checkmark" size={13} color={backgroundColor} />}
            </View>
          )}

          <Text
            className="flex-1 text-base font-semibold text-white"
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {object.name}
          </Text>

          <View className="flex-row items-center gap-1.5" style={{ flexShrink: 0 }}>
            {object.status !== 'active' && <ObjectStatusBadge status={object.status} />}

            <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: extensionColor }}>
              <Text className="text-[10px] font-bold uppercase text-white">{object.extension}</Text>
            </View>
          </View>
        </View>

        <ObjectTags tags={object.tags} maxVisible={3} variant="onColor" />
      </View>
    </Pressable>
  );
}
