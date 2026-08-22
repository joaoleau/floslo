import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useThemeColors } from '@/hooks/useThemeColors';

interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}

export function EmptyState({ icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  const colors = useThemeColors();

  return (
    // Top-anchored (not vertically centered): centering within whatever flex space is left
    // below the floating header always lands lower than expected once that leftover space
    // shrinks (a permission banner above it, etc.) — see the same issue fixed on the
    // login/register screens.
    <View className="items-center gap-4 px-8 mt-10">
      <View className="h-24 w-24 items-center justify-center rounded-full bg-accent">
        <Ionicons name={icon} size={44} color={colors.primary} />
      </View>

      <View className="items-center gap-1">
        <Text className="text-center text-xl font-bold text-foreground">{title}</Text>
        <Text className="text-center text-muted-foreground">{description}</Text>
      </View>

      <Button onPress={onAction} className="mt-2 flex-row items-center gap-2 rounded-full bg-primary px-6">
        <Ionicons name="add" size={18} color="white" />
        <Text className="font-semibold text-primary-foreground">{actionLabel}</Text>
      </Button>
    </View>
  );
}
