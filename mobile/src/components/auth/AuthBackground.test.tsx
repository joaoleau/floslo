jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: { View },
    Easing: { inOut: () => undefined, sin: undefined },
    useSharedValue: (value: number) => ({ value }),
    useAnimatedStyle: () => ({}),
    withRepeat: (value: unknown) => value,
    withTiming: (value: unknown) => value,
  };
});

import { Text } from 'react-native';
import { screen } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils/renderWithProviders';
import { AuthBackground } from './AuthBackground';

describe('AuthBackground', () => {
  it('clips the floating blobs to its own area, so they never cover the header above it', async () => {
    await renderWithProviders(
      <AuthBackground>
        <Text>conteúdo</Text>
      </AuthBackground>
    );

    expect(screen.getByTestId('auth-background').props.style).toEqual(expect.objectContaining({ overflow: 'hidden' }));
    expect(screen.getByText('conteúdo')).toBeTruthy();
  });
});
