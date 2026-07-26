import { FlatList } from 'react-native';
import { useState } from 'react';

import { Screen } from '@/components/common/Screen';
import { Header } from '@/components/common/Header';
import { HeaderAction } from '@/components/common/HeaderAction';

import { SoundCard } from '@/components/scheduler/SoundCard';

import { mockSounds } from '@/api/mock/sounds';

export default function Sound() {
  const [selectedSound, setSelectedSound] = useState('Radar');

  function handleSave() {
    console.log('Som selecionado:', selectedSound);

    // futuramente:
    // salvar no scheduler
    // router.back()
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
            selected={selectedSound === item.name}
            onPress={() => setSelectedSound(item.name)}
          />
        )}

        contentContainerClassName="w-full px-4 pt-2 pb-4 gap-2"

        showsVerticalScrollIndicator={false}
      />
    </Screen>
  );
}
