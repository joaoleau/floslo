import { screen, fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils/renderWithProviders';
import { ObjectCard } from './ObjectCard';
import { ObjectType } from '@/types/domain/Object';

const object: ObjectType = {
  id: 'obj-1',
  name: 'Apostila de Inglês.pdf',
  extension: 'pdf',
  tags: ['gramatica', 'verbos'],
  status: 'active',
};

describe('ObjectCard', () => {
  it('shows the object name and its extension badge', async () => {
    await renderWithProviders(<ObjectCard object={object} />);
    expect(screen.getByText('Apostila de Inglês.pdf')).toBeTruthy();
    expect(screen.getByText('pdf')).toBeTruthy();
  });

  it('shows a status badge only when the object is not active yet', async () => {
    const { rerender } = await renderWithProviders(<ObjectCard object={object} />);
    expect(screen.queryByText('Processando')).toBeNull();

    await rerender(<ObjectCard object={{ ...object, status: 'processing' }} />);
    expect(screen.getByText('Processando')).toBeTruthy();
  });

  it('calls onPress and onLongPress', async () => {
    const onPress = jest.fn();
    const onLongPress = jest.fn();
    await renderWithProviders(<ObjectCard object={object} onPress={onPress} onLongPress={onLongPress} />);

    await fireEvent.press(screen.getByText('Apostila de Inglês.pdf'));
    expect(onPress).toHaveBeenCalledTimes(1);

    await fireEvent(screen.getByText('Apostila de Inglês.pdf'), 'longPress');
    expect(onLongPress).toHaveBeenCalledTimes(1);
  });

  it('shows a checkbox indicator only in selection mode', async () => {
    const { rerender } = await renderWithProviders(<ObjectCard object={object} />);
    expect(screen.queryByTestId('object-card-checkbox')).toBeNull();

    await rerender(<ObjectCard object={object} selectionMode selected />);
    expect(screen.getByTestId('object-card-checkbox')).toBeTruthy();
  });

  it('shows a destructive badge when processing failed, with the error-flavored label', async () => {
    await renderWithProviders(<ObjectCard object={{ ...object, status: 'failed' }} />);
    expect(screen.getByText('Falhou')).toBeTruthy();
  });

  it('renders with no tags at all without crashing', async () => {
    await renderWithProviders(<ObjectCard object={{ ...object, tags: [] }} />);
    expect(screen.getByText('Apostila de Inglês.pdf')).toBeTruthy();
  });

  it('caps visible tags at 3 and shows a "+N" overflow chip for the rest', async () => {
    await renderWithProviders(<ObjectCard object={{ ...object, tags: ['a', 'b', 'c', 'd', 'e'] }} />);
    expect(screen.getByText('a')).toBeTruthy();
    expect(screen.getByText('b')).toBeTruthy();
    expect(screen.getByText('c')).toBeTruthy();
    expect(screen.queryByText('d')).toBeNull();
    expect(screen.getByText('+2')).toBeTruthy();
  });
});
