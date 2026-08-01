import { useState } from 'react';
import { FlatList } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';

import { Screen } from '@/components/common/Screen';
import { Header } from '@/components/common/Header';
import { HeaderAction } from '@/components/common/HeaderAction';
import { SoundCard } from '@/components/scheduler/SoundCard';
import { soundService } from '@/services/soundService';
import { soundSelectionService } from '@/services/soundSelectionService';

export default function SoundScreen() {
  const router = useRouter();
  const { currentSound } = useLocalSearchParams();
  const sounds = soundService.getAvailableSounds();

  const [selectedSoundName, setSelectedSoundName] = useState(
    typeof currentSound === 'string' ? currentSound : sounds[0]?.name
  );

  function handleSave() {
    const chosenSound = sounds.find((s) => s.name === selectedSoundName) || sounds[0];

    // Envia o som direto para o serviço global e volta para a tela anterior (Create ou Edit)
    soundSelectionService.selectSound(chosenSound);
    router.back();
  }

  return (
    <Screen edges={['top', 'left', 'right', 'bottom']}>
      <Header title="Selecionar Som" rightAction={<HeaderAction icon="checkmark" onPress={handleSave} />} />

      <FlatList
        data={sounds}
        keyExtractor={(item) => item.name}
        renderItem={({ item }) => (
          <SoundCard
            sound={item}
            selected={selectedSoundName === item.name}
            onPress={() => setSelectedSoundName(item.name)}
          />
        )}
        contentContainerClassName="w-full px-4 pt-2 pb-4 gap-2"
        showsVerticalScrollIndicator={false}
      />
    </Screen>
  );
}
