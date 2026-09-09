import { screen, fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils/renderWithProviders';
import { ObjectTagItem } from './ObjectTagItem';

describe('ObjectTagItem', () => {
  it('shows the tag text', async () => {
    await renderWithProviders(<ObjectTagItem tag="gramatica" />);
    expect(screen.getByText('gramatica')).toBeTruthy();
  });

  it('is disabled when neither onPressTag nor onRemoveTag is given', async () => {
    await renderWithProviders(<ObjectTagItem tag="gramatica" />);
    expect(screen.getByTestId('tag-item').props.accessibilityState?.disabled).toBe(true);
  });

  it('calls onPressTag with the tag when pressed', async () => {
    const onPressTag = jest.fn();
    await renderWithProviders(<ObjectTagItem tag="verbos" onPressTag={onPressTag} />);

    await fireEvent.press(screen.getByTestId('tag-item'));

    expect(onPressTag).toHaveBeenCalledWith('verbos');
  });

  it('shows a remove button only when onRemoveTag is given, and calls it with the tag', async () => {
    const onRemoveTag = jest.fn();
    const onPressTag = jest.fn();
    const { rerender } = await renderWithProviders(<ObjectTagItem tag="verbos" onPressTag={onPressTag} />);
    expect(screen.queryByTestId('tag-item-remove')).toBeNull();

    await rerender(<ObjectTagItem tag="verbos" onPressTag={onPressTag} onRemoveTag={onRemoveTag} />);

    await fireEvent.press(screen.getByTestId('tag-item-remove'));
    expect(onRemoveTag).toHaveBeenCalledWith('verbos');
    // Pressing the remove button must not also trigger the outer tag press.
    expect(onPressTag).not.toHaveBeenCalled();
  });

  it('renders without crashing in the onColor variant', async () => {
    await renderWithProviders(<ObjectTagItem tag="ingles" variant="onColor" />);
    expect(screen.getByText('ingles')).toBeTruthy();
  });
});
