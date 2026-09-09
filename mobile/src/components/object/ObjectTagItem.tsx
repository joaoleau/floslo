import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Badge } from '@/components/ui/badge';
import { Text } from '@/components/ui/text';
import { useThemeColors } from '@/hooks/useThemeColors';

interface ObjectTagItemProps {
  tag: string;

  onPressTag?: (tag: string) => void;
  onRemoveTag?: (tag: string) => void;

  /** 'onColor': mesmo fundo translúcido branco usado pelos chips de desafio do
   * SchedulerCard, pra ficar em cima do fundo colorido do ObjectCard. */
  variant?: 'default' | 'onColor';
}

export function ObjectTagItem({ tag, onPressTag, onRemoveTag, variant = 'default' }: ObjectTagItemProps) {
  const colors = useThemeColors();
  const onColor = variant === 'onColor';

  return (
    <Pressable testID="tag-item" disabled={!onPressTag && !onRemoveTag} onPress={() => onPressTag?.(tag)}>
      <Badge className={`flex-row items-center rounded-full py-0.5 ${onColor ? 'bg-white/20 border-transparent' : 'bg-secondary'}`}>
        <Text className={`text-xs ${onColor ? 'text-white' : 'text-secondary-foreground'}`}>{tag}</Text>

        {onRemoveTag && (
          <Pressable testID="tag-item-remove" hitSlop={8} onPress={() => onRemoveTag(tag)} className="ml-2">
            <Ionicons name="close" size={12} color={onColor ? '#FFFFFF' : colors.foreground} />
          </Pressable>
        )}
      </Badge>
    </Pressable>
  );
}
