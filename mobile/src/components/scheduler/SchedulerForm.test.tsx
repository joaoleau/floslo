import { createRef } from 'react';
import { screen, fireEvent, act } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils/renderWithProviders';
import { SchedulerForm, SchedulerFormRef } from './SchedulerForm';
import { Scheduler } from '@/types/domain/Scheduler';

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));

const TYPES = ['MULTIPLE_CHOICE', 'TRUE_FALSE', 'DISCOVERY'];

const baseScheduler: Scheduler = {
  id: 'sched-1',
  name: 'Estudo',
  language: 'pt',
  weekDays: ['monday'],
  startTime: '08:30',
  alarmSound: 'chic_pop',
  objectIds: [],
  challengers: [],
  enabled: true,
  vibration: true,
  soundEnabled: true,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

async function renderForm(initialValues: Scheduler = baseScheduler) {
  const onSubmit = jest.fn();
  const ref = createRef<SchedulerFormRef>();
  await renderWithProviders(
    <SchedulerForm ref={ref} initialValues={initialValues} availableObjects={[]} onSubmit={onSubmit} />,
  );
  return { onSubmit, ref };
}

// Toca `times` vezes no mais (ou no menos) do tipo.
async function press(type: string, button: 'increment' | 'decrement', times = 1) {
  for (let index = 0; index < times; index += 1) {
    await fireEvent.press(screen.getByTestId(`scheduler-form-challenge-${type}-${button}`));
  }
}

async function submitted(ref: React.RefObject<SchedulerFormRef | null>, onSubmit: jest.Mock): Promise<Scheduler> {
  await act(async () => {
    ref.current?.submit();
  });
  return onSubmit.mock.calls[onSubmit.mock.calls.length - 1][0];
}

const counterText = () => [screen.getByTestId('scheduler-form-item-count').props.children].flat().join('');
const valueOf = (type: string) => screen.getByTestId(`scheduler-form-challenge-${type}-value`).props.children;

describe('SchedulerForm challenges', () => {
  it('keeps the language field inside the challenges card, with no step numbers and no add button', async () => {
    await renderForm();
    expect(screen.getAllByText('Desafios')).toHaveLength(1);
    expect(screen.getByText('Idioma dos desafios')).toBeTruthy();
    expect(screen.getByTestId('language-selected-label').props.children).toBe('Português');
    expect(screen.queryByText('1')).toBeNull();
    expect(screen.queryByText('2')).toBeNull();
    expect(screen.queryByTestId('scheduler-form-add-challenge')).toBeNull();
  });

  it('shows the four types at once, all at zero for a new scheduler', async () => {
    await renderForm();
    for (const type of TYPES) expect(valueOf(type)).toBe(0);
    expect(counterText()).toBe('0 de 10 itens');
  });

  it('starts from the counts the scheduler already has', async () => {
    await renderForm({
      ...baseScheduler,
      challengers: [
        { challengeType: 'MULTIPLE_CHOICE', challenge: { questionCount: 5 } },
        { challengeType: 'DISCOVERY', challenge: { discoveryCount: 1 } },
      ],
    });
    expect(valueOf('MULTIPLE_CHOICE')).toBe(5);
    expect(valueOf('DISCOVERY')).toBe(1);
    expect(counterText()).toBe('6 de 10 itens');
  });

  it('builds the challengers from the counters, one per type in the fixed order', async () => {
    const { ref, onSubmit } = await renderForm();
    await press('DISCOVERY', 'increment', 3);
    await press('MULTIPLE_CHOICE', 'increment', 5);
    const result = await submitted(ref, onSubmit);
    expect(result.challengers).toEqual([
      { challengeType: 'MULTIPLE_CHOICE', challenge: { questionCount: 5 } },
      { challengeType: 'DISCOVERY', challenge: { discoveryCount: 3 } },
    ]);
    expect(counterText()).toBe('8 de 10 itens');
  });

  it('shares the budget: a counter cannot take more than what is left', async () => {
    const { ref, onSubmit } = await renderForm();
    await press('MULTIPLE_CHOICE', 'increment', 7);
    await press('TRUE_FALSE', 'increment', 5);
    const result = await submitted(ref, onSubmit);
    expect(result.challengers).toEqual([
      { challengeType: 'MULTIPLE_CHOICE', challenge: { questionCount: 7 } },
      { challengeType: 'TRUE_FALSE', challenge: { questionCount: 3 } },
    ]);
    expect(counterText()).toBe('10 de 10 itens');
  });

  it('disables the plus of every type once the limit is reached', async () => {
    await renderForm();
    await press('MULTIPLE_CHOICE', 'increment', 10);
    for (const type of TYPES) {
      expect(screen.getByTestId(`scheduler-form-challenge-${type}-increment`).props.accessibilityState.disabled).toBe(true);
    }
    expect(screen.getByTestId('scheduler-form-challenge-MULTIPLE_CHOICE-decrement').props.accessibilityState.disabled).toBe(false);
  });

  it('frees the budget when a counter goes down, and zero takes the type out', async () => {
    const { ref, onSubmit } = await renderForm();
    await press('MULTIPLE_CHOICE', 'increment', 7);
    await press('MULTIPLE_CHOICE', 'decrement');
    await press('DISCOVERY', 'increment', 4);
    expect(valueOf('MULTIPLE_CHOICE')).toBe(6);
    expect(valueOf('DISCOVERY')).toBe(4);
    await press('MULTIPLE_CHOICE', 'decrement', 6);
    expect(valueOf('MULTIPLE_CHOICE')).toBe(0);
    const result = await submitted(ref, onSubmit);
    expect(result.challengers).toEqual([{ challengeType: 'DISCOVERY', challenge: { discoveryCount: 4 } }]);
  });

  it('does not let a counter go below zero', async () => {
    await renderForm();
    expect(screen.getByTestId('scheduler-form-challenge-MULTIPLE_CHOICE-decrement').props.accessibilityState.disabled).toBe(true);
    await press('MULTIPLE_CHOICE', 'decrement');
    expect(valueOf('MULTIPLE_CHOICE')).toBe(0);
  });

  it('shows the item count under the language, followed by the single total bar and then the counters', async () => {
    await renderForm();
    const tree = JSON.stringify(screen.toJSON());
    const language = tree.indexOf('language-picker');
    const count = tree.indexOf('scheduler-form-item-count');
    const totalBar = tree.indexOf('scheduler-form-total-bar');
    const firstCounter = tree.indexOf('scheduler-form-challenge-MULTIPLE_CHOICE');
    expect(language).toBeGreaterThan(-1);
    expect(language).toBeLessThan(count);
    expect(count).toBeLessThan(totalBar);
    expect(totalBar).toBeLessThan(firstCounter);
  });

  it('has no segmented bar under each challenge, only the total bar', async () => {
    await renderForm();
    expect(screen.getAllByTestId('scheduler-form-total-bar')).toHaveLength(1);
    for (const type of TYPES) expect(screen.queryByTestId(`scheduler-form-bar-${type}`)).toBeNull();
  });

  it('changes the language of the whole scheduler from the picker', async () => {
    const { ref, onSubmit } = await renderForm();
    await fireEvent.press(screen.getByTestId('language-picker'));
    await fireEvent.press(screen.getByTestId('language-option-it'));
    const result = await submitted(ref, onSubmit);
    expect(result.language).toBe('it');
    expect(screen.getByTestId('language-selected-label').props.children).toBe('Italiano');
    expect(screen.queryByTestId('language-option-fr')).toBeNull();
  });
});
