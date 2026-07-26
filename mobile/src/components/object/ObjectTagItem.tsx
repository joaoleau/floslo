import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Badge } from '@/components/ui/badge';
import { Text } from '@/components/ui/text';

interface ObjectTagItemProps {
  tag: string;

  onPressTag?: (tag: string) => void;

  onRemoveTag?: (tag: string) => void;
}

export function ObjectTagItem({ tag, onPressTag, onRemoveTag }: ObjectTagItemProps) {
  return (
    <Pressable disabled={!onPressTag && !onRemoveTag} onPress={() => onPressTag?.(tag)}>
      <Badge className="flex-row items-center rounded-full bg-brand-100 py-0.5">
        <Text className="text-xs text-white">{tag}</Text>

        {onRemoveTag && (
          <Pressable hitSlop={8} onPress={() => onRemoveTag(tag)} className="ml-2">
            <Ionicons name="close" size={12} color="white" />
          </Pressable>
        )}
      </Badge>
    </Pressable>
  );
}
