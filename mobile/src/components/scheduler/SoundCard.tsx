import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';

import { Sound } from '@/types/domain/Scheduler';
import { formatSoundLabel } from '@/services/soundService';
import { useThemeColors } from '@/hooks/useThemeColors';

interface SoundCardProps {
  sound: Sound;
  selected?: boolean;
  previewing?: boolean;
  onPress?: () => void;
  onTogglePreview?: () => void;
}

export function SoundCard({ sound, selected = false, previewing = false, onPress, onTogglePreview }: SoundCardProps) {
  const colors = useThemeColors();
  return (
    <Pressable onPress={onPress}>
      <Card className="rounded-[32px] px-5 py-4">
        <View className="flex-row items-center">
          <Pressable
            onPress={onTogglePreview}
            hitSlop={8}
            className="mr-4 h-8 w-8 items-center justify-center rounded-full bg-brand-100"
          >
            <Ionicons name={previewing ? 'pause' : 'play'} size={16} color="white" />
          </Pressable>

          <View className="flex-1">
            <Text className="text-lg font-medium text-foreground">{formatSoundLabel(sound.name)}</Text>
          </View>

          <Ionicons
            name={selected ? 'radio-button-on' : 'radio-button-off'}
            size={24}
            color={selected ? colors.primary : colors.brandSoft}
          />
        </View>
      </Card>
    </Pressable>
  );
}
