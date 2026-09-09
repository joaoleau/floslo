import { render, screen } from '@testing-library/react-native';
import { View } from 'react-native';
import { Text } from './text';

describe('Text', () => {
  it('renders as RNText by default, with no heading role', async () => {
    await render(<Text testID="text">Olá</Text>);
    const el = screen.getByTestId('text');
    expect(el.props.role).toBeUndefined();
    expect(el.props['aria-level']).toBeUndefined();
  });

  it('applies a heading role and aria-level for heading variants', async () => {
    await render(
      <Text testID="heading" variant="h2">
        Título
      </Text>
    );
    const el = screen.getByTestId('heading');
    expect(el.props.role).toBe('heading');
    expect(el.props['aria-level']).toBe('2');
  });

  it('renders its child directly (no wrapping Text) when asChild is set', async () => {
    await render(
      <Text asChild>
        <View testID="text-child" />
      </Text>
    );
    expect(screen.getByTestId('text-child')).toBeTruthy();
  });
});
