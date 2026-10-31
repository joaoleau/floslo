import { screen, fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils/renderWithProviders';
import { ItemCountStepper } from './ItemCountStepper';

async function renderStepper(props: Partial<React.ComponentProps<typeof ItemCountStepper>> = {}) {
  const onChange = jest.fn();
  await renderWithProviders(
    <ItemCountStepper
      testID="stepper"
      label="Múltipla escolha"
      description="Perguntas"
      icon="school-outline"
      color="#208fe9"
      value={3}
      cap={10}
      onChange={onChange}
      {...props}
    />,
  );
  return onChange;
}

describe('ItemCountStepper', () => {
  it('shows the label, the description and the current number', async () => {
    await renderStepper();
    expect(screen.getByText('Múltipla escolha')).toBeTruthy();
    expect(screen.getByText('Perguntas')).toBeTruthy();
    expect(screen.getByTestId('stepper-value').props.children).toBe(3);
  });

  it('puts the minus and plus buttons on either side of the number', async () => {
    await renderStepper();
    const order = JSON.stringify(screen.toJSON());
    expect(order.indexOf('stepper-decrement')).toBeLessThan(order.indexOf('stepper-value'));
    expect(order.indexOf('stepper-value')).toBeLessThan(order.indexOf('stepper-increment'));
  });

  it('adds one when the plus is pressed', async () => {
    const onChange = await renderStepper({ value: 3 });
    await fireEvent.press(screen.getByTestId('stepper-increment'));
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it('takes one away when the minus is pressed', async () => {
    const onChange = await renderStepper({ value: 3 });
    await fireEvent.press(screen.getByTestId('stepper-decrement'));
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it('does not go below zero', async () => {
    const onChange = await renderStepper({ value: 0 });
    await fireEvent.press(screen.getByTestId('stepper-decrement'));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByTestId('stepper-decrement').props.accessibilityState.disabled).toBe(true);
  });

  it('does not go above the cap', async () => {
    const onChange = await renderStepper({ value: 4, cap: 4 });
    await fireEvent.press(screen.getByTestId('stepper-increment'));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByTestId('stepper-increment').props.accessibilityState.disabled).toBe(true);
  });

  it('keeps both buttons enabled in the middle of the range', async () => {
    await renderStepper({ value: 3, cap: 5 });
    expect(screen.getByTestId('stepper-decrement').props.accessibilityState.disabled).toBe(false);
    expect(screen.getByTestId('stepper-increment').props.accessibilityState.disabled).toBe(false);
  });

  it('names the buttons for screen readers', async () => {
    await renderStepper();
    expect(screen.getByLabelText('Diminuir Múltipla escolha')).toBeTruthy();
    expect(screen.getByLabelText('Aumentar Múltipla escolha')).toBeTruthy();
  });
});
