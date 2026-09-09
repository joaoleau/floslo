import { useTheme } from '@/lib/ThemeProvider';
import { FIXED_HEX, HEX } from '@/lib/theme-tokens';

/**
 * Resolves the active theme into plain hex values for places that take a real color
 * (e.g. `<Ionicons color="...">`) instead of a NativeWind className.
 */
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
    success: FIXED_HEX.success,
    destructive: FIXED_HEX.destructive,
    white: '#FFFFFF',
  };
}
