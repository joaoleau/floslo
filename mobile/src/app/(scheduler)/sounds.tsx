import { useEffect, useState } from 'react';
import { FlatList, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAudioPlayer } from 'expo-audio';
import * as Application from 'expo-application';

import { Screen } from '@/components/common/Screen';
import { Header } from '@/components/common/Header';
import { HeaderAction } from '@/components/common/HeaderAction';
import { SoundCard } from '@/components/scheduler/SoundCard';
import { soundService } from '@/services/soundService';
import { soundSelectionService } from '@/services/soundSelectionService';

// expo-audio pode liberar o player nativo por baixo dos panos (desmontagem, troca de
// fonte, fast refresh) sem expor nenhum jeito de checar isso antes de chamar um método
// -- só lança "Cannot use shared object that was already released". Não tem nada de
// errado pra nós nesse caso (não tem mais nada pra pausar/tocar mesmo).
function safePlayerCall(fn: () => void) {
  try {
    fn();
  } catch (err) {
    console.warn('[SoundScreen] Chamada no player de prévia ignorada (provavelmente já liberado)', err);
  }
}

export default function SoundScreen() {
  const router = useRouter();
  const { currentSound } = useLocalSearchParams();
  const sounds = soundService.getAvailableSounds();

  const [selectedSoundName, setSelectedSoundName] = useState(
    typeof currentSound === 'string' ? currentSound : sounds[0]?.name
  );

  // Prévia: um único player, uma prévia por vez -- trocar de som pausa a anterior
  // automaticamente porque a URI muda. Mesmo padrão de resolução de URI do firing.tsx
  // (Android only; sem recurso equivalente pra iOS hoje).
  const [previewingSoundName, setPreviewingSoundName] = useState<string | null>(null);
  const packageName = Application.applicationId;
  const previewUri =
    Platform.OS === 'android' && previewingSoundName
      ? `android.resource://${packageName}/raw/${previewingSoundName}`
      : '';
  const previewPlayer = useAudioPlayer({ uri: previewUri });

  useEffect(() => {
    if (previewingSoundName && Platform.OS === 'android') {
      safePlayerCall(() => previewPlayer.play());
    }
  }, [previewingSoundName, previewPlayer]);

  // O player nativo pode já ter sido liberado quando esse cleanup roda (troca rápida
  // de som, navegação saindo da tela, fast refresh) -- expo-audio não expõe um jeito
  // de checar isso antes de chamar, só lança "shared object that was already
  // released". Não é um erro de verdade pra nós (não tem mais nada pra pausar mesmo).
  useEffect(() => {
    return () => {
      safePlayerCall(() => previewPlayer.pause());
    };
  }, [previewPlayer]);

  function handleTogglePreview(soundName: string) {
    if (previewingSoundName === soundName) {
      safePlayerCall(() => previewPlayer.pause());
      setPreviewingSoundName(null);
    } else {
      setPreviewingSoundName(soundName);
    }
  }

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
            previewing={previewingSoundName === item.name}
            onPress={() => setSelectedSoundName(item.name)}
            onTogglePreview={() => handleTogglePreview(item.name)}
          />
        )}
        contentContainerClassName="w-full px-4 pt-2 pb-4 gap-2"
        showsVerticalScrollIndicator={false}
      />
    </Screen>
  );
}
