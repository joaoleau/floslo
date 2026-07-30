import { Sound } from '@/types/domain/Scheduler';

// Static, bundled alarm-sound catalog — there's no backend endpoint for
// sounds (they ship as Android raw resources), so this isn't a query.
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
