import { useState } from 'react';
import { FlatList } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';

import { Screen } from '@/components/common/Screen';
import { Header } from '@/components/common/Header';
import { HeaderAction } from '@/components/common/HeaderAction';
import { SoundCard } from '@/components/scheduler/SoundCard';
import { mockSounds } from '@/api/mock/sounds';
import { soundSelectionService } from '@/services/soundSelectionService';

export default function SoundScreen() {
  const router = useRouter();
  const { currentSound } = useLocalSearchParams();
  
  const [selectedSoundName, setSelectedSoundName] = useState(
    typeof currentSound === 'string' ? currentSound : 'Radar'
  );

  function handleSave() {
    const chosenSound = mockSounds.find((s) => s.name === selectedSoundName) || mockSounds[0];

    console.log('[SoundScreen] Som escolhido:', chosenSound);

    // 1. Envia o som direto para o serviço global
    soundSelectionService.selectSound(chosenSound);

    // 2. Volta para a tela anterior (Create ou Edit, tanto faz)
    router.back();
  }

  return (
    <Screen edges={['top', 'left', 'right', 'bottom']}>
      <Header
        title="Selecionar Som"
        rightAction={<HeaderAction icon="checkmark" onPress={handleSave} />}
      />

      <FlatList
        data={mockSounds}
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