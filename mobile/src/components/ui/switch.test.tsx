import { render, screen, fireEvent } from '@testing-library/react-native';
import { Switch } from './switch';

describe('Switch', () => {
  it('reports checked/unchecked in its accessibility state and calls onCheckedChange when pressed', async () => {
    const onCheckedChange = jest.fn();
    await render(<Switch testID="switch" checked={false} onCheckedChange={onCheckedChange} />);

    const el = screen.getByTestId('switch');
    expect(el.props.accessibilityState).toEqual({ checked: false, disabled: undefined });

    await fireEvent.press(el);
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it('ignores presses and reports disabled=true when disabled', async () => {
    const onCheckedChange = jest.fn();
    await render(<Switch testID="switch" checked disabled onCheckedChange={onCheckedChange} />);

    const el = screen.getByTestId('switch');
    expect(el.props.accessibilityState).toEqual({ checked: true, disabled: true });

    await fireEvent.press(el);
    expect(onCheckedChange).not.toHaveBeenCalled();
  });
});
