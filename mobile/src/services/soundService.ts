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

// Os nomes dos sons são slugs de arquivo ("chic_pop") -- formata pra exibição
// ("Chic Pop") nos lugares onde o usuário vê o som já escolhido/selecionado.
export function formatSoundLabel(name: string): string {
  return name
    .split('_')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
