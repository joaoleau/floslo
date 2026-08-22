import { vars } from 'nativewind';

interface ModeTokens {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  border: string;
  input: string;
  ring: string;
  /** "Ink" accent — the brand blue, but readable as text/icon color on that mode's
   *  own background (darker blue on light surfaces, lighter blue on dark surfaces). */
  brand: string;
  brandForeground: string;
  brandSoft: string;
}

// Neutral (non-brown) surfaces + a single blue brand accent, theme-aware in both
// directions so brand text/icons stay readable whether the card under them is light
// or dark.
export const LIGHT: ModeTokens = {
  background: '210 20% 98%',
  foreground: '222 20% 12%',
  card: '0 0% 100%',
  cardForeground: '222 20% 12%',
  popover: '0 0% 100%',
  popoverForeground: '222 20% 12%',
  primary: '217 91% 45%',
  primaryForeground: '0 0% 100%',
  secondary: '210 20% 95%',
  secondaryForeground: '222 20% 20%',
  muted: '210 16% 93%',
  mutedForeground: '215 15% 45%',
  accent: '213 90% 94%',
  accentForeground: '217 80% 30%',
  destructive: '0 84% 60%',
  border: '214 20% 88%',
  input: '214 20% 88%',
  ring: '217 91% 45%',
  brand: '217 91% 40%',
  brandForeground: '0 0% 100%',
  brandSoft: '215 20% 55%',
};

export const DARK: ModeTokens = {
  background: '222 18% 9%',
  foreground: '210 20% 96%',
  card: '222 16% 14%',
  cardForeground: '210 20% 96%',
  popover: '222 16% 14%',
  popoverForeground: '210 20% 96%',
  primary: '217 91% 62%',
  primaryForeground: '222 30% 10%',
  secondary: '222 14% 18%',
  secondaryForeground: '210 15% 90%',
  muted: '222 12% 18%',
  mutedForeground: '215 12% 65%',
  accent: '217 30% 22%',
  accentForeground: '213 80% 85%',
  destructive: '0 70% 59%',
  border: '222 12% 22%',
  input: '222 12% 22%',
  ring: '217 91% 62%',
  // Deliberately not as light as `primary` — most `bg-brand-*` uses are solid fills
  // (buttons, badges, the tab bar pill) with hardcoded white icon/text on top, so this
  // stays dark/saturated enough for that contrast while being light enough to read as
  // heading/ink text on a dark card.
  brand: '213 88% 60%',
  brandForeground: '0 0% 100%',
  brandSoft: '215 15% 65%',
};

export const FIXED_HEX = {
  success: '#16A34A',
  destructive: '#EF4444',
};

// Hex mirrors of the tokens above, for native props that can't consume CSS
// variables (e.g. `<Ionicons color="...">`). Keep these in sync with LIGHT/DARK.
export const HEX = {
  light: { brand: '#0F4FC4', brandSoft: '#6B7A90', primary: '#0A5ADB', foreground: '#181C25' },
  dark: { brand: '#4F97F0', brandSoft: '#9AA7B8', primary: '#4689F6', foreground: '#F3F5F7' },
};

/** Builds the NativeWind `vars()` style object for light or dark mode. */
export function getThemeStyle(mode: 'light' | 'dark') {
  const tokens = mode === 'dark' ? DARK : LIGHT;

  return vars({
    '--background': tokens.background,
    '--foreground': tokens.foreground,
    '--card': tokens.card,
    '--card-foreground': tokens.cardForeground,
    '--popover': tokens.popover,
    '--popover-foreground': tokens.popoverForeground,
    '--primary': tokens.primary,
    '--primary-foreground': tokens.primaryForeground,
    '--secondary': tokens.secondary,
    '--secondary-foreground': tokens.secondaryForeground,
    '--muted': tokens.muted,
    '--muted-foreground': tokens.mutedForeground,
    '--accent': tokens.accent,
    '--accent-foreground': tokens.accentForeground,
    '--border': tokens.border,
    '--input': tokens.input,
    '--ring': tokens.ring,
    '--brand': tokens.brand,
    '--brand-foreground': tokens.brandForeground,
    '--brand-soft': tokens.brandSoft,
    '--destructive': tokens.destructive,
    '--success': '142 71% 45%',
    '--radius': '1rem',
  });
}
