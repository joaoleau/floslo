import { Sound } from '@/types/domain/Scheduler';

const AVAILABLE_SOUNDS: Sound[] = [
  { name: 'twinkling_holiday_cheer' },
  { name: 'dark_horror_scary' },
  { name: 'heart_of_hope_pop_fireworks' },
  { name: 'heart_of_hope_pop_wave_groove' },
  { name: 'rington_malibu' },
  { name: 'chic_pop' },
];

export const soundService = {
  getAvailableSounds(): Sound[] {
    return AVAILABLE_SOUNDS;
  },
};

export function formatSoundLabel(name: string): string {
  return name
    .split('_')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
