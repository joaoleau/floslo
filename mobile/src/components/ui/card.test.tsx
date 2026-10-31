import { View } from 'react-native';
import { screen, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils/renderWithProviders';
import { preferencesStorage } from '@/storage/preferencesStorage';
import { Card } from './card';

jest.mock('@/storage/preferencesStorage', () => ({
  preferencesStorage: {
    getThemeMode: jest.fn(),
    saveThemeMode: jest.fn(),
  },
}));

function flatStyleOf(testId: string) {
  const style = screen.getByTestId(testId).props.style;
  return Array.isArray(style) ? Object.assign({}, ...style) : style;
}

describe('Card', () => {
  it('gives it a darker bottom edge in light mode (the "light from above" effect)', async () => {
    (preferencesStorage.getThemeMode as jest.Mock).mockResolvedValue('light');
    await renderWithProviders(<Card testID="card" />);

    await waitFor(() => {
      expect(flatStyleOf('card').borderBottomColor).toBe('rgba(0,0,0,0.15)');
    });
    expect(flatStyleOf('card').borderBottomWidth).toBe(2);
  });

  it('flips to a lighter bottom edge in dark mode instead', async () => {
    (preferencesStorage.getThemeMode as jest.Mock).mockResolvedValue('dark');
    await renderWithProviders(<Card testID="card" />);

    await waitFor(() => {
      expect(flatStyleOf('card').borderBottomColor).toBe('rgba(255,255,255,0.08)');
    });
  });

  it('still applies a caller-provided style on top of the default', async () => {
    (preferencesStorage.getThemeMode as jest.Mock).mockResolvedValue('light');
    await renderWithProviders(<Card testID="card" style={{ maxWidth: 340 }} />);

    await waitFor(() => {
      expect(flatStyleOf('card').maxWidth).toBe(340);
    });
    expect(flatStyleOf('card').borderBottomWidth).toBe(2);
  });

  it('still renders children normally', async () => {
    (preferencesStorage.getThemeMode as jest.Mock).mockResolvedValue('light');
    await renderWithProviders(
      <Card>
        <View testID="child" />
      </Card>
    );
    expect(screen.getByTestId('child')).toBeTruthy();
  });
});
