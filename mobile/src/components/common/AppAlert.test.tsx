import { act, screen, fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils/renderWithProviders';
import { AppAlert } from './AppAlert';
import { alertService } from '@/services/alertService';

describe('AppAlert', () => {
  it('renders nothing until an alert is shown', async () => {
    await renderWithProviders(<AppAlert />);
    expect(screen.queryByText(/./)).toBeNull();
  });

  it('shows the title, message and buttons published through alertService', async () => {
    await renderWithProviders(<AppAlert />);

    await act(() => {
      alertService.show({
        title: 'Excluir agendador',
        message: 'Tem certeza?',
        buttons: [{ text: 'Cancelar', style: 'cancel' }, { text: 'Excluir', style: 'destructive' }],
      });
    });

    expect(screen.getByText('Excluir agendador')).toBeTruthy();
    expect(screen.getByText('Tem certeza?')).toBeTruthy();
    expect(screen.getByText('Cancelar')).toBeTruthy();
    expect(screen.getByText('Excluir')).toBeTruthy();
  });

  it('calls the pressed button\'s onPress and dismisses the alert', async () => {
    await renderWithProviders(<AppAlert />);
    const onConfirm = jest.fn();

    await act(() => {
      alertService.show({
        title: 'Excluir agendador',
        buttons: [{ text: 'Cancelar', style: 'cancel' }, { text: 'Excluir', style: 'destructive', onPress: onConfirm }],
      });
    });

    await fireEvent.press(screen.getByText('Excluir'));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Excluir agendador')).toBeNull();
  });

  it('falls back to a single OK button when none are provided', async () => {
    await renderWithProviders(<AppAlert />);

    await act(() => {
      alertService.show({ title: 'Aviso' });
    });

    expect(screen.getByText('OK')).toBeTruthy();
  });
});
