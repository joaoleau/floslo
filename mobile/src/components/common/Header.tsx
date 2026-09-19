import { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '@/components/ui/text';
import { useThemeColors } from '@/hooks/useThemeColors';

interface HeaderProps {
  title: string;

  showBackButton?: boolean;
  onBack?: () => void;

  rightAction?: ReactNode;
}

export function Header({ title, showBackButton = true, onBack, rightAction }: HeaderProps) {
  const router = useRouter();
  const colors = useThemeColors();

  function handleBack() {
    if (onBack) {
      onBack();
      return;
    }

    router.back();
  }

  return (
    <View className="h-14 flex-row items-center border-b border-border bg-background px-4">
      <View className="w-10 items-start justify-center">
        {showBackButton && (
          <Pressable
            hitSlop={10}
            onPress={handleBack}
            className="h-10 w-10 items-center justify-center"
          >
            <Ionicons name="chevron-back" size={24} color={colors.brand} />
          </Pressable>
        )}
      </View>

      <View className="flex-1 items-center justify-center">
        <Text numberOfLines={1} className="text-lg font-semibold text-foreground overflow-hidden">
          {title}
        </Text>
      </View>

      <View className="min-w-10 flex-row items-center justify-end gap-2">{rightAction}</View>
    </View>
  );
}
