import { screen, fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils/renderWithProviders';
import { ObjectPicker, unavailableReason } from './ObjectPicker';
import { ObjectType } from '@/types/domain/Object';

const ready: ObjectType = { id: 'o1', name: 'Biologia.pdf', extension: '.pdf', tags: ['célula'], status: 'active' };
const withoutTags: ObjectType = { id: 'o2', name: 'Vazio.pdf', extension: '.pdf', tags: [], status: 'active' };
const processing: ObjectType = { id: 'o3', name: 'Novo.pdf', extension: '.pdf', tags: [], status: 'processing' };

describe('unavailableReason', () => {
  it('lets a processed document with tags be linked', () => {
    expect(unavailableReason(ready)).toBeNull();
  });

  it('explains why a document cannot be linked yet', () => {
    expect(unavailableReason(withoutTags)).toBe('Sem tags: adicione uma na aba Objetos');
    expect(unavailableReason(processing)).toBe('Em processamento');
    expect(unavailableReason({ ...ready, status: 'failed' })).toBe('O processamento falhou');
  });
});

describe('ObjectPicker', () => {
  it('does not link a document without tags', async () => {
    const onChange = jest.fn();
    await renderWithProviders(<ObjectPicker objects={[ready, withoutTags]} selectedIds={[]} onChange={onChange} />);

    await fireEvent.press(screen.getByText('Adicionar objeto'));
    await fireEvent.press(screen.getByText('Vazio.pdf'));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText('Sem tags: adicione uma na aba Objetos')).toBeTruthy();

    await fireEvent.press(screen.getByText('Biologia.pdf'));
    expect(onChange).toHaveBeenCalledWith(['o1']);
  });
});
