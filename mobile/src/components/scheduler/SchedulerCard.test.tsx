import { screen, fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils/renderWithProviders';
import { SchedulerCard } from './SchedulerCard';
import { DISABLED_CARD_COLOR, getColorForId } from '@/lib/hashColor';

// A cor de fundo fica na View logo dentro do Pressable do card.
function cardColor(): string {
  return screen.getByTestId('scheduler-card-surface').props.style.backgroundColor;
}
import { Scheduler } from '@/types/domain/Scheduler';

const scheduler: Scheduler = {
  id: 'sched-1',
  name: 'Revisão de Inglês',
  language: 'en',
  weekDays: ['monday', 'wednesday'],
  startTime: '07:30',
  alarmSound: 'chic_pop',
  objectIds: ['obj-1'],
  challengers: [{ challengeType: 'MULTIPLE_CHOICE', challenge: { questionCount: 5 } }],
  enabled: true,
  vibration: true,
  soundEnabled: true,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

describe('SchedulerCard', () => {
  it('shows the scheduler name and start time', async () => {
    await renderWithProviders(<SchedulerCard scheduler={scheduler} />);
    expect(screen.getByText('Revisão de Inglês')).toBeTruthy();
    expect(screen.getByText('07:30')).toBeTruthy();
  });

  it('shows the label for every linked challenge', async () => {
    await renderWithProviders(<SchedulerCard scheduler={scheduler} />);
    expect(screen.getByText('Múltipla escolha')).toBeTruthy();
  });

  it('shows the scheduler language once, in the header, and not per challenge', async () => {
    const mixedScheduler: Scheduler = {
      ...scheduler,
      challengers: [
        { challengeType: 'MULTIPLE_CHOICE', challenge: { questionCount: 3 } },
        { challengeType: 'DISCOVERY', challenge: { discoveryCount: 2 } },
      ],
    };
    await renderWithProviders(<SchedulerCard scheduler={mixedScheduler} />);

    expect(screen.getAllByText('🇺🇸')).toHaveLength(1);
    expect(screen.getByTestId('scheduler-card-language')).toBeTruthy();
  });

  it('calls onPress when tapped and onLongPress when held', async () => {
    const onPress = jest.fn();
    const onLongPress = jest.fn();
    await renderWithProviders(<SchedulerCard scheduler={scheduler} onPress={onPress} onLongPress={onLongPress} />);

    await fireEvent.press(screen.getByText('Revisão de Inglês'));
    expect(onPress).toHaveBeenCalledTimes(1);

    await fireEvent(screen.getByText('Revisão de Inglês'), 'longPress');
    expect(onLongPress).toHaveBeenCalledTimes(1);
  });

  it('shows a checkbox indicator only in selection mode', async () => {
    const { rerender } = await renderWithProviders(<SchedulerCard scheduler={scheduler} />);
    expect(screen.queryByTestId('scheduler-card-checkbox')).toBeNull();

    await rerender(<SchedulerCard scheduler={scheduler} selectionMode selected />);
    expect(screen.getByTestId('scheduler-card-checkbox')).toBeTruthy();
  });

  it('describes a TRUE_FALSE challenge by its statement count', async () => {
    const trueFalseScheduler: Scheduler = {
      ...scheduler,
      challengers: [{ challengeType: 'TRUE_FALSE', challenge: { questionCount: 4 } }],
    };
    await renderWithProviders(<SchedulerCard scheduler={trueFalseScheduler} />);

    expect(screen.getByText('Verdadeiro ou Falso')).toBeTruthy();
    expect(screen.getByText('4 afirmações')).toBeTruthy();
  });

  it('describes a DISCOVERY challenge by its discovery count', async () => {
    const discoveryScheduler: Scheduler = {
      ...scheduler,
      challengers: [{ challengeType: 'DISCOVERY', challenge: { discoveryCount: 3 } }],
    };
    await renderWithProviders(<SchedulerCard scheduler={discoveryScheduler} />);

    expect(screen.getByText('Descoberta')).toBeTruthy();
    expect(screen.getByText('3 descobertas')).toBeTruthy();
  });

  it('never shows a difficulty', async () => {
    await renderWithProviders(<SchedulerCard scheduler={scheduler} />);

    expect(screen.queryByText('Fácil')).toBeNull();
    expect(screen.queryByText('Médio')).toBeNull();
    expect(screen.queryByText('Difícil')).toBeNull();
  });

  it('hides the object-count badge when no objects are linked', async () => {
    await renderWithProviders(<SchedulerCard scheduler={{ ...scheduler, objectIds: [] }} />);
    expect(screen.queryByText('1')).toBeNull();
  });

  it('does not render the challenges section at all when there are none', async () => {
    await renderWithProviders(<SchedulerCard scheduler={{ ...scheduler, challengers: [] }} />);
    expect(screen.queryByText('Múltipla escolha')).toBeNull();
  });

  it('shows a disabled scheduler without color, also while selecting', async () => {
    const { rerender } = await renderWithProviders(<SchedulerCard scheduler={scheduler} />);
    expect(cardColor()).toBe(getColorForId(scheduler.id));

    await rerender(<SchedulerCard scheduler={{ ...scheduler, enabled: false }} />);
    expect(cardColor()).toBe(DISABLED_CARD_COLOR);

    await rerender(<SchedulerCard scheduler={{ ...scheduler, enabled: false }} selectionMode />);
    expect(cardColor()).toBe(DISABLED_CARD_COLOR);
  });
});
