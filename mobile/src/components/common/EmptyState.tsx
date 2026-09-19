import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useThemeColors } from '@/hooks/useThemeColors';

interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;

  actionLabel?: string;
  onAction?: () => void;

  /** Cor do badge/botão -- cada tela usa a sua, pra não ficarem todas idênticas. */
  color?: string;
}

export function EmptyState({ icon, title, description, actionLabel, onAction, color }: EmptyStateProps) {
  const colors = useThemeColors();
  const accent = color ?? colors.brand;

  return (
    // Top-anchored (not vertically centered): centering within whatever flex space is left
    // below the floating header always lands lower than expected once that leftover space
    // shrinks (a permission banner above it, etc.) — see the same issue fixed on the
    // login/register screens.
    <View className="items-center gap-4 px-8 mt-10">
      <View className="h-28 w-28 items-center justify-center rounded-full" style={{ backgroundColor: `${accent}1F` }}>
        <View className="h-20 w-20 items-center justify-center rounded-full" style={{ backgroundColor: accent }}>
          <Ionicons name={icon} size={36} color="#FFFFFF" />
        </View>
      </View>

      <View className="items-center gap-1">
        <Text className="text-center text-xl font-bold text-foreground">{title}</Text>
        <Text className="text-center text-muted-foreground">{description}</Text>
      </View>

      {!!actionLabel && !!onAction && (
        <Button
          onPress={onAction}
          className="mt-2 flex-row items-center gap-2 rounded-3xl px-6"
          style={{ backgroundColor: accent }}
        >
          <Ionicons name="add" size={18} color="white" />
          <Text className="font-semibold text-white">{actionLabel}</Text>
        </Button>
      )}
    </View>
  );
}
