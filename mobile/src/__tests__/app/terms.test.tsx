jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn(), canGoBack: () => true }) }));

import { screen } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils/renderWithProviders';
import TermsScreen from '@/app/terms';

describe('TermsScreen', () => {
  it('shows every section, including the international transfer and the AI notice', async () => {
    await renderWithProviders(<TermsScreen />);

    for (const key of ['about', 'data', 'purpose', 'storage', 'ai', 'copyright', 'rights', 'security', 'changes']) {
      expect(screen.getByTestId(`terms-section-${key}`)).toBeTruthy();
    }
    expect(screen.getByText('4. Onde os dados ficam')).toBeTruthy();
    expect(screen.getByText('5. Conteúdo gerado por inteligência artificial')).toBeTruthy();
    expect(screen.getByText('Versão de 26/10/2026')).toBeTruthy();
  });
});
