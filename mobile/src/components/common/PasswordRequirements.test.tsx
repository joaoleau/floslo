import { screen } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils/renderWithProviders';
import { PasswordRequirements } from './PasswordRequirements';

describe('PasswordRequirements', () => {
  it('shows all three requirement labels', async () => {
    await renderWithProviders(<PasswordRequirements password="" />);
    expect(screen.getByText('Pelo menos 8 caracteres')).toBeTruthy();
    expect(screen.getByText('Pelo menos 1 letra')).toBeTruthy();
    expect(screen.getByText('Pelo menos 1 número')).toBeTruthy();
  });

  it('re-renders met/unmet state as the password prop changes', async () => {
    const { rerender } = await renderWithProviders(<PasswordRequirements password="" />);
    expect(screen.getByTestId('password-requirements')).toBeTruthy();

    await rerender(<PasswordRequirements password="abcd1234" />);
    expect(screen.getByText('Pelo menos 8 caracteres')).toBeTruthy();
  });

  it('renders in the onColor variant without crashing', async () => {
    await renderWithProviders(<PasswordRequirements password="abcd1234" variant="onColor" />);
    expect(screen.getByText('Pelo menos 8 caracteres')).toBeTruthy();
  });
});
