import { useTheme } from '@/lib/ThemeProvider';
import { FIXED_HEX, HEX } from '@/lib/theme-tokens';

export function useThemeColors() {
  const { mode } = useTheme();
  const hex = mode === 'dark' ? HEX.dark : HEX.light;

  return {
    brand: hex.brand,
    brandSoft: hex.brandSoft,
    primary: hex.primary,
    primaryForeground: hex.primaryForeground,
    foreground: hex.foreground,
    background: hex.background,
    mutedForeground: hex.mutedForeground,
    success: FIXED_HEX.success,
    destructive: FIXED_HEX.destructive,
    white: '#FFFFFF',
  };
}
