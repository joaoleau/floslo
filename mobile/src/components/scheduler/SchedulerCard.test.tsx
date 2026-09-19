import { screen, fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils/renderWithProviders';
import { SchedulerCard } from './SchedulerCard';
import { Scheduler } from '@/types/domain/Scheduler';

const scheduler: Scheduler = {
  id: 'sched-1',
  name: 'Revisão de Inglês',
  weekDays: ['monday', 'wednesday'],
  startTime: '07:30',
  alarmSound: 'chic_pop',
  objectIds: ['obj-1'],
  challengers: [{ challengeType: 'QUIZ', language: 'en', challenge: { questionCount: 5, difficulty: 'medium' } }],
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
    expect(screen.getByText('Quiz')).toBeTruthy();
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

  it('describes a TRUE_FALSE challenge by its statement count, with no card count text', async () => {
    const trueFalseScheduler: Scheduler = {
      ...scheduler,
      challengers: [{ challengeType: 'TRUE_FALSE', language: 'pt', challenge: { questionCount: 4, difficulty: 'hard' } }],
    };
    await renderWithProviders(<SchedulerCard scheduler={trueFalseScheduler} />);

    expect(screen.getByText('Verdadeiro ou Falso')).toBeTruthy();
    expect(screen.getByText('4 afirmações')).toBeTruthy();
    expect(screen.getByText('Difícil')).toBeTruthy();
  });

  it('describes a FLASHCARD challenge by its card count, with no difficulty shown', async () => {
    const flashcardScheduler: Scheduler = {
      ...scheduler,
      challengers: [{ challengeType: 'FLASHCARD', language: 'pt', challenge: { cardCount: 7 } }],
    };
    await renderWithProviders(<SchedulerCard scheduler={flashcardScheduler} />);

    expect(screen.getByText('Flashcard')).toBeTruthy();
    expect(screen.getByText('7 cartões')).toBeTruthy();
    // FLASHCARD has no difficulty concept -- none of the difficulty labels should leak in.
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
    expect(screen.queryByText('Quiz')).toBeNull();
  });

  it('dims a disabled scheduler outside of selection mode, but not while selecting', async () => {
    const { rerender } = await renderWithProviders(<SchedulerCard scheduler={{ ...scheduler, enabled: false }} />);
    expect(screen.getByTestId('scheduler-card').props.style).toEqual({ opacity: 0.45 });

    // Being dimmed as "off" would be confusing feedback while the user is mid-selection --
    // the selection-mode dimming (on the inner View) takes over instead.
    await rerender(<SchedulerCard scheduler={{ ...scheduler, enabled: false }} selectionMode />);
    expect(screen.getByTestId('scheduler-card').props.style).toBeUndefined();
  });
});
