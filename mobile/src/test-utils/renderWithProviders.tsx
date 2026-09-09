import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react-native';

import { ThemeProvider } from '@/lib/ThemeProvider';

/**
 * Wraps a component in the app's real ThemeProvider before rendering -- anything using
 * useThemeColors()/useTheme() (directly or through a child) throws without it. Use the
 * plain `render` from @testing-library/react-native instead for components that don't
 * touch theme context, to keep tests focused on what they actually depend on.
 */
export function renderWithProviders(ui: ReactElement, options?: RenderOptions) {
  return render(ui, { wrapper: ThemeProvider, ...options });
}

export * from '@testing-library/react-native';
