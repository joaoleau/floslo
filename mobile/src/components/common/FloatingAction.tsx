import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface FloatingActionProps {
  icon: keyof typeof Ionicons.glyphMap;

  onPress: () => void;

  visible?: boolean;

  disabled?: boolean;

  top?: number;

  bottom?: number;

  right?: number;

  size?: number;

  color?: string;

  backgroundColor?: string;
}

export function FloatingAction({
  icon,
  onPress,
  visible = true,
  disabled = false,
  top = 0,
  bottom = 0,
  right = 0,
  size = 30,
  color = '#FFFFFF',
  backgroundColor = '#303031',
}: FloatingActionProps) {
  if (!visible) {
    return null;
  }

  return (
    <Pressable
      hitSlop={10}
      disabled={disabled}
      onPress={onPress}
      style={{
        position: 'absolute',
        top,
        right,

        zIndex: 100,

        backgroundColor,
      }}
      className="h-14 w-14 items-center justify-center rounded-full active:opacity-80"
    >
      <Ionicons name={icon} size={size} color={disabled ? '#A1A1AA' : color} />
    </Pressable>
  );
}
