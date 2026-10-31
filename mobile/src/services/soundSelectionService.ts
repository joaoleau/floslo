import { Sound } from '@/types/domain/Scheduler';

let selectedSoundListener: ((sound: Sound) => void) | null = null;

export const soundSelectionService = {
  selectSound(sound: Sound) {
    if (selectedSoundListener) {
      selectedSoundListener(sound);
    }
  },

  subscribe(listener: (sound: Sound) => void) {
    selectedSoundListener = listener;
    return () => {
      selectedSoundListener = null;
    };
  },
};