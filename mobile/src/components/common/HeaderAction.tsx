import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useThemeColors } from '@/hooks/useThemeColors';

interface HeaderActionProps {
  icon: keyof typeof Ionicons.glyphMap;

  onPress: () => void;

  disabled?: boolean;

  size?: number;

  color?: string;
}

export function HeaderAction({
  icon,
  onPress,
  disabled = false,
  size = 24,
  color,
}: HeaderActionProps) {
  const colors = useThemeColors();
  return (
    <Pressable
      hitSlop={10}
      disabled={disabled}
      onPress={onPress}
      className="h-10 w-10 items-center justify-center rounded-full active:bg-secondary"
    >
      <Ionicons name={icon} size={size} color={disabled ? '#A1A1AA' : color ?? colors.brand} />
    </Pressable>
  );
}
