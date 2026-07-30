// src/services/soundSelectionService.ts
import { Sound } from '@/types/domain/Scheduler';

let selectedSoundListener: ((sound: Sound) => void) | null = null;

export const soundSelectionService = {
  // Chamado pela SoundScreen quando o usuário escolhe um som
  selectSound(sound: Sound) {
    if (selectedSoundListener) {
      selectedSoundListener(sound);
    }
  },

  // Chamado pelo SchedulerForm para se inscrever e ouvir quando um som for escolhido
  subscribe(listener: (sound: Sound) => void) {
    selectedSoundListener = listener;
    return () => {
      selectedSoundListener = null;
    };
  },
};