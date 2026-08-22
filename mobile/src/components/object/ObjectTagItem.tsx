import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Badge } from '@/components/ui/badge';
import { Text } from '@/components/ui/text';
import { useThemeColors } from '@/hooks/useThemeColors';

interface ObjectTagItemProps {
  tag: string;

  onPressTag?: (tag: string) => void;

  onRemoveTag?: (tag: string) => void;
}

export function ObjectTagItem({ tag, onPressTag, onRemoveTag }: ObjectTagItemProps) {
  const colors = useThemeColors();

  return (
    <Pressable disabled={!onPressTag && !onRemoveTag} onPress={() => onPressTag?.(tag)}>
      <Badge className="flex-row items-center rounded-full bg-secondary py-0.5">
        <Text className="text-xs text-secondary-foreground">{tag}</Text>

        {onRemoveTag && (
          <Pressable hitSlop={8} onPress={() => onRemoveTag(tag)} className="ml-2">
            <Ionicons name="close" size={12} color={colors.foreground} />
          </Pressable>
        )}
      </Badge>
    </Pressable>
  );
}
