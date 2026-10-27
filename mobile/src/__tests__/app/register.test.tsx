const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush, replace: mockReplace }) }));

const mockMutateAsync = jest.fn(() => Promise.resolve());
jest.mock('@/hooks/useAuth', () => ({
  useRegisterMutation: () => ({ mutateAsync: mockMutateAsync, isPending: false }),
}));

jest.mock('@/services/sessionService', () => ({ sessionService: { start: jest.fn(() => Promise.resolve('/onboarding')) } }));

const mockShowAlert = jest.fn();
jest.mock('@/services/alertService', () => ({ showAlert: (...args: unknown[]) => mockShowAlert(...args) }));

// O fundo animado das telas de autenticação não importa aqui.
jest.mock('@/components/auth/AuthBackground', () => ({
  AuthBackground: ({ children }: { children: React.ReactNode }) => children,
}));

import { act, fireEvent, screen } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils/renderWithProviders';
import { TERMS_VERSION } from '@/constants/terms';
import RegisterScreen from '@/app/(auth)/register';

async function fillForm() {
  await fireEvent.changeText(screen.getByPlaceholderText('E-mail'), 'ana@example.com');
  await fireEvent.changeText(screen.getByPlaceholderText('Nome de usuário'), 'ana');
  await fireEvent.changeText(screen.getByPlaceholderText('Senha'), 'abcd1234');
}

afterEach(() => jest.clearAllMocks());

describe('RegisterScreen', () => {
  it('does not create the account until the terms are accepted', async () => {
    await renderWithProviders(<RegisterScreen />);
    await fillForm();

    await act(async () => {
      await fireEvent.press(screen.getByText('Cadastrar'));
    });

    expect(mockMutateAsync).not.toHaveBeenCalled();
    expect(mockShowAlert).toHaveBeenCalledWith(
      'Atenção',
      'Para criar a conta, leia e aceite os Termos de uso e a Política de privacidade.'
    );
  });

  it('sends the accepted terms version with the sign up', async () => {
    await renderWithProviders(<RegisterScreen />);
    await fillForm();
    await fireEvent.press(screen.getByTestId('accept-terms'));

    await act(async () => {
      await fireEvent.press(screen.getByText('Cadastrar'));
    });

    expect(mockMutateAsync).toHaveBeenCalledWith({
      email: 'ana@example.com',
      username: 'ana',
      password: 'abcd1234',
      accepted_terms_version: TERMS_VERSION,
    });
  });

  it('opens the terms from the acceptance text', async () => {
    await renderWithProviders(<RegisterScreen />);
    await fireEvent.press(screen.getByTestId('terms-link'));
    expect(mockPush).toHaveBeenCalledWith('/terms');
  });
});
