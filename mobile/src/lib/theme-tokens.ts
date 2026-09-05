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
  /** Cinza-chumbo neutro, não a cor de marca -- ver comentário acima de LIGHT/DARK. */
  brand: string;
  brandForeground: string;
  brandSoft: string;
}

// Minimalista, 100% neutro (branco/preto/cinza) -- nenhum hue de marca em lugar
// nenhum, nem azul (original) nem laranja (tentativa anterior, rejeitada). `primary`
// é "ink" -- quase-preto no light, quase-branco no dark, inverte com o tema (usado em
// ícones estruturais/navegação). `brand` é um cinza-chumbo neutro que **não** inverte
// com o tema (fica escuro nos dois modos, de propósito -- é usado como preenchimento
// sólido com texto branco por cima: botões, indicador ativo do footer, o fundo cheio
// da tela de alarme tocando; se invertesse pro claro no dark mode, esse texto branco
// ficaria ilegível). `success`/`destructive` continuam as únicas cores "de verdade"
// do app -- são semânticas (certo/errado), não decoração.
export const LIGHT: ModeTokens = {
  background: '210 20% 98%',
  foreground: '222 20% 12%',
  card: '0 0% 100%',
  cardForeground: '222 20% 12%',
  popover: '0 0% 100%',
  popoverForeground: '222 20% 12%',
  primary: '222 20% 12%',
  primaryForeground: '0 0% 100%',
  secondary: '210 20% 95%',
  secondaryForeground: '222 20% 20%',
  muted: '210 16% 93%',
  mutedForeground: '215 15% 45%',
  accent: '210 16% 94%',
  accentForeground: '222 20% 12%',
  destructive: '0 84% 60%',
  border: '214 20% 88%',
  input: '214 20% 88%',
  ring: '220 9% 40%',
  brand: '220 8% 26%',
  brandForeground: '0 0% 100%',
  brandSoft: '220 9% 45%',
};

export const DARK: ModeTokens = {
  background: '222 18% 9%',
  foreground: '210 20% 96%',
  card: '222 16% 14%',
  cardForeground: '210 20% 96%',
  popover: '222 16% 14%',
  popoverForeground: '210 20% 96%',
  primary: '210 20% 96%',
  primaryForeground: '222 30% 10%',
  secondary: '222 14% 18%',
  secondaryForeground: '210 15% 90%',
  muted: '222 12% 18%',
  mutedForeground: '215 12% 65%',
  accent: '222 12% 20%',
  accentForeground: '210 20% 96%',
  destructive: '0 70% 59%',
  border: '222 12% 22%',
  input: '222 12% 22%',
  ring: '220 9% 60%',
  // Um pouco mais claro que a versão light (mesma lógica de antes, só sem hue): fica
  // visível contra o fundo bem escuro da página, mas ainda escuro o bastante pro
  // texto branco por cima continuar legível.
  brand: '220 7% 36%',
  brandForeground: '0 0% 100%',
  brandSoft: '220 9% 65%',
};

export const FIXED_HEX = {
  success: '#16A34A',
  destructive: '#EF4444',
};

// Hex mirrors of the tokens above, for native props that can't consume CSS
// variables (e.g. `<Ionicons color="...">`). Keep these in sync with LIGHT/DARK.
export const HEX = {
  light: { brand: '#3B3F45', brandSoft: '#6B7078', primary: '#181C25', foreground: '#181C25' },
  dark: { brand: '#565A63', brandSoft: '#A4A8AF', primary: '#F3F5F7', foreground: '#F3F5F7' },
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
