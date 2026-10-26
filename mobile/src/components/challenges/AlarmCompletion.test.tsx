// O ambiente de teste não carrega o reanimated real: troca Animated.View por uma View comum.
jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  const animation = { duration: () => animation, delay: () => animation };
  return { __esModule: true, default: { View }, FadeInDown: animation, ZoomIn: animation };
});

import { act, fireEvent, screen } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils/renderWithProviders';
import { AlarmCompletion, completionMessage } from './AlarmCompletion';

const base = { answeredCount: 6, gradedCount: 2, correctCount: 1, onFinish: jest.fn() };

describe('completionMessage', () => {
  it('celebrates a perfect session first, then a streak going up', () => {
    expect(completionMessage({ streak: 5, previousStreak: 4, gradedCount: 3, correctCount: 3 })).toBe('perfect');
    expect(completionMessage({ streak: 5, previousStreak: 4, gradedCount: 3, correctCount: 2 })).toBe('streakUp');
    expect(completionMessage({ streak: 5, previousStreak: 5, gradedCount: 3, correctCount: 2 })).toBe('done');
    // Só Descobertas: não há o que acertar, então não conta como sessão perfeita.
    expect(completionMessage({ streak: 5, previousStreak: 5, gradedCount: 0, correctCount: 0 })).toBe('done');
  });
});

describe('AlarmCompletion', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('shows the score without discoveries in it, and the streak moving up to today', async () => {
    await renderWithProviders(<AlarmCompletion {...base} streak={5} previousStreak={4} />);

    expect(screen.getByTestId('alarm-completion-score').props.children).toBe('1/2 de primeira • 4 descobertas');
    expect(screen.getByText('Sequência de 4 dias')).toBeTruthy();

    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    expect(screen.getByText('Sequência de 5 dias')).toBeTruthy();
    expect(screen.getByText('Mais um dia na sequência')).toBeTruthy();
  });

  it('keeps the streak still when today was already counted', async () => {
    await renderWithProviders(<AlarmCompletion {...base} streak={1} previousStreak={1} />);
    expect(screen.getByText('Sequência de 1 dia')).toBeTruthy();
  });

  it('closes the firing screen on finish', async () => {
    const onFinish = jest.fn();
    await renderWithProviders(<AlarmCompletion {...base} streak={undefined} previousStreak={undefined} onFinish={onFinish} />);
    expect(screen.queryByTestId('alarm-completion-streak')).toBeNull();
    fireEvent.press(screen.getByTestId('alarm-completion-finish'));
    expect(onFinish).toHaveBeenCalled();
  });
});
