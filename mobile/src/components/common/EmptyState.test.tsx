import { screen, fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils/renderWithProviders';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('renders the title and description', async () => {
    await renderWithProviders(
      <EmptyState
        icon="alarm-outline"
        title="Nenhum agendador ainda"
        description="Crie seu primeiro agendador."
      />
    );

    expect(screen.getByText('Nenhum agendador ainda')).toBeTruthy();
    expect(screen.getByText('Crie seu primeiro agendador.')).toBeTruthy();
  });

  it('does not render an action button when none is provided', async () => {
    await renderWithProviders(<EmptyState icon="alarm-outline" title="Vazio" description="Nada aqui." />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('calls onAction when the action button is pressed', async () => {
    const onAction = jest.fn();
    await renderWithProviders(
      <EmptyState
        icon="alarm-outline"
        title="Nenhum agendador ainda"
        description="Crie seu primeiro agendador."
        actionLabel="Criar agendador"
        onAction={onAction}
      />
    );

    await fireEvent.press(screen.getByText('Criar agendador'));
    expect(onAction).toHaveBeenCalledTimes(1);
  });
});
