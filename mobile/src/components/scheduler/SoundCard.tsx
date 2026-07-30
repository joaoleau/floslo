import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';

import { Sound } from '@/types/domain/Scheduler';

interface SoundCardProps {
  sound: Sound;
  selected?: boolean;
  onPress?: () => void;
}

export function SoundCard({ sound, selected = false, onPress }: SoundCardProps) {
  return (
    <Pressable onPress={onPress}>
      <Card className="rounded-[32px] bg-white px-5 py-4">
        <View className="flex-row items-center">
          <View className="mr-4 h-8 w-8 items-center justify-center rounded-full bg-brand-100">
            <Ionicons name="musical-notes" size={16} color="white" />
          </View>

          <View className="flex-1">
            <Text className="text-lg font-medium text-brand-100">{sound.name}</Text>
          </View>

          <Ionicons
            name={selected ? 'radio-button-on' : 'radio-button-off'}
            size={24}
            color="#3459A5"
          />
        </View>
      </Card>
    </Pressable>
  );
}
