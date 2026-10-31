import { useEffect, useState } from 'react';
import { FlatList, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAudioPlayer } from 'expo-audio';
import * as Application from 'expo-application';

import { Screen } from '@/components/common/Screen';
import { Header } from '@/components/common/Header';
import { HeaderAction } from '@/components/common/HeaderAction';
import { SoundCard } from '@/components/scheduler/SoundCard';
import { soundService } from '@/services/soundService';
import { soundSelectionService } from '@/services/soundSelectionService';

function safePlayerCall(fn: () => void) {
  try {
    fn();
  } catch (err) {
    console.warn('[SoundScreen] Chamada no player de prévia ignorada (provavelmente já liberado)', err);
  }
}

export default function SoundScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { currentSound } = useLocalSearchParams();
  const sounds = soundService.getAvailableSounds();

  const [selectedSoundName, setSelectedSoundName] = useState(
    typeof currentSound === 'string' ? currentSound : sounds[0]?.name
  );

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

    soundSelectionService.selectSound(chosenSound);
    router.back();
  }

  return (
    <Screen edges={['top', 'left', 'right', 'bottom']}>
      <Header title={t('schedulers.sounds.title')} rightAction={<HeaderAction icon="checkmark" onPress={handleSave} />} />

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
