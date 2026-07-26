import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
  color = '#303031',
}: HeaderActionProps) {
  return (
    <Pressable
      hitSlop={10}
      disabled={disabled}
      onPress={onPress}
      className="h-10 w-10 items-center justify-center rounded-full active:bg-zinc-100"
    >
      <Ionicons name={icon} size={size} color={disabled ? '#A1A1AA' : color} />
    </Pressable>
  );
}
