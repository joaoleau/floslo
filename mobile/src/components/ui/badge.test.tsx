import { render, screen } from '@testing-library/react-native';
import { View } from 'react-native';
import { Badge } from './badge';

describe('Badge', () => {
  it('renders as a plain View by default', async () => {
    await render(<Badge testID="badge" />);
    expect(screen.getByTestId('badge')).toBeTruthy();
  });

  it('renders its child directly (no wrapping View) when asChild is set', async () => {
    await render(
      <Badge asChild>
        <View testID="badge-child" />
      </Badge>
    );
    expect(screen.getByTestId('badge-child')).toBeTruthy();
  });
});
