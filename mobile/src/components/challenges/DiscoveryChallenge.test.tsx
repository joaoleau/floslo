// O ambiente de teste não carrega o reanimated real: troca Animated.View por uma View comum.
jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  return { __esModule: true, default: { View }, FadeInDown: { duration: () => undefined } };
});

import { screen, fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils/renderWithProviders';
import { DiscoveryChallenge } from './DiscoveryChallenge';
import { Discovery } from '@/types/domain/RAG';

const discovery: Discovery = {
  title: 'Mitocôndrias carregam o próprio DNA',
  content: 'Elas têm um pequeno genoma, separado do núcleo. Isso vem de uma origem bacteriana.',
  tag: 'biologia celular',
  sourceChunks: [],
};

describe('DiscoveryChallenge', () => {
  it('presents the title and the content, with no question and no rating', async () => {
    await renderWithProviders(
      <DiscoveryChallenge discovery={discovery} currentIndex={1} totalDiscoveries={4} onSuccess={jest.fn()} />
    );

    expect(screen.getByText(discovery.title)).toBeTruthy();
    expect(screen.getByText(discovery.content)).toBeTruthy();
    expect(screen.getByText('2 / 4')).toBeTruthy();
    expect(screen.queryByText('Mostrar resposta')).toBeNull();
    expect(screen.queryByText('Errei')).toBeNull();
  });

  it('confirms the reading with "Continuar" and reports no attempts', async () => {
    const onSuccess = jest.fn();
    await renderWithProviders(
      <DiscoveryChallenge discovery={discovery} currentIndex={0} totalDiscoveries={1} onSuccess={onSuccess} />
    );

    await fireEvent.press(screen.getByText('Continuar'));

    expect(onSuccess).toHaveBeenCalledWith({ wrongAttempts: 0 });
  });

  it('works without a title', async () => {
    await renderWithProviders(
      <DiscoveryChallenge discovery={{ ...discovery, title: '' }} currentIndex={0} totalDiscoveries={1} onSuccess={jest.fn()} />
    );

    expect(screen.getByText(discovery.content)).toBeTruthy();
  });
});
