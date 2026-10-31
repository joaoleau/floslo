import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { useTranslation } from 'react-i18next';

import { ObjectTags } from '@/components/object/ObjectTags';
import { ObjectStatusBadge } from '@/components/object/ObjectStatusBadge';
import { ObjectType } from '@/types/domain/Object';
import { getColorForId } from '@/lib/hashColor';
import { cardSurface } from '@/lib/cardSurface';
import { useThemeColors } from '@/hooks/useThemeColors';
import { getExtensionColor } from '@/lib/fileExtensionColors';

interface ObjectCardProps {
  object: ObjectType;
  onPress?: () => void;
  onLongPress?: () => void;
  selectionMode?: boolean;
  selected?: boolean;
}

export function ObjectCard({ object, onPress, onLongPress, selectionMode = false, selected = false }: ObjectCardProps) {
  const colors = useThemeColors();
  useTranslation();
  const outlined = object.status !== 'active';
  const backgroundColor = getColorForId(object.id);
  const ink = outlined ? colors.primary : '#FFFFFF';
  const extensionColor = getExtensionColor(object.extension);

  return (
    <Pressable testID="object-card" onPress={onPress} onLongPress={onLongPress}>
      <View
        testID="object-card-surface"
        className={`rounded-[28px] px-4 py-3.5 gap-2.5 ${outlined ? 'border border-border bg-card' : ''}`}
        style={cardSurface({ color: backgroundColor, outlined, selected, dimmed: selectionMode && !selected, ink })}
      >
        <View className="flex-row items-start justify-between gap-2">
          {selectionMode && (
            <View
              testID="object-card-checkbox"
              className="items-center justify-center rounded-full"
              style={{
                width: 20,
                height: 20,
                backgroundColor: selected ? ink : 'transparent',
                borderWidth: selected ? 0 : 2,
                borderColor: ink,
              }}
            >
              {selected && <Ionicons name="checkmark" size={13} color={outlined ? colors.primaryForeground : backgroundColor} />}
            </View>
          )}

          <Text
            className={`flex-1 text-base font-semibold ${outlined ? 'text-foreground' : 'text-white'}`}
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

        <ObjectTags tags={object.tags} maxVisible={3} variant={outlined ? 'default' : 'onColor'} />
      </View>
    </Pressable>
  );
}
