import { render, screen, fireEvent } from '@testing-library/react-native';
import { SchedulerListFilters, matchesSchedulerFilter } from './SchedulerListFilters';
import { Scheduler } from '@/types/domain/Scheduler';

function makeScheduler(overrides: Partial<Scheduler> = {}): Scheduler {
  return {
    id: 'scheduler-1',
    name: 'Sem Nome',
    language: 'pt',
    weekDays: [],
    startTime: '08:00',
    alarmSound: 'chic_pop',
    objectIds: [],
    challengers: [],
    enabled: true,
    vibration: true,
    soundEnabled: true,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

describe('matchesSchedulerFilter', () => {
  // 2026-03-11 is a Wednesday.
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-03-11T10:00:00'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('"all" matches every scheduler regardless of state', () => {
    expect(matchesSchedulerFilter(makeScheduler({ enabled: true }), 'all')).toBe(true);
    expect(matchesSchedulerFilter(makeScheduler({ enabled: false }), 'all')).toBe(true);
  });

  it('"disabled" only matches schedulers that are off', () => {
    expect(matchesSchedulerFilter(makeScheduler({ enabled: false }), 'disabled')).toBe(true);
    expect(matchesSchedulerFilter(makeScheduler({ enabled: true }), 'disabled')).toBe(false);
  });

  it('"today" matches a scheduler whose weekDays include the current weekday', () => {
    const scheduler = makeScheduler({ weekDays: ['wednesday'] });
    expect(matchesSchedulerFilter(scheduler, 'today')).toBe(true);
  });

  it('"today" does not match a scheduler that does not fire today', () => {
    const scheduler = makeScheduler({ weekDays: ['thursday'] });
    expect(matchesSchedulerFilter(scheduler, 'today')).toBe(false);
  });

  it('"tomorrow" matches the next weekday, not today', () => {
    const scheduler = makeScheduler({ weekDays: ['thursday'] });
    expect(matchesSchedulerFilter(scheduler, 'tomorrow')).toBe(true);
    expect(matchesSchedulerFilter(scheduler, 'today')).toBe(false);
  });

  it('an empty weekDays list means "every day" -- matches both today and tomorrow', () => {
    const scheduler = makeScheduler({ weekDays: [] });
    expect(matchesSchedulerFilter(scheduler, 'today')).toBe(true);
    expect(matchesSchedulerFilter(scheduler, 'tomorrow')).toBe(true);
  });

  it('a disabled scheduler never matches "today" or "tomorrow", even if the weekday fits', () => {
    const scheduler = makeScheduler({ weekDays: ['wednesday'], enabled: false });
    expect(matchesSchedulerFilter(scheduler, 'today')).toBe(false);
  });

  it('wraps the week correctly when today is the last day of the week', () => {
    // 2026-03-14 is a Saturday -- tomorrow must wrap around to Sunday, not go out of bounds.
    jest.setSystemTime(new Date('2026-03-14T10:00:00'));
    const scheduler = makeScheduler({ weekDays: ['sunday'] });
    expect(matchesSchedulerFilter(scheduler, 'tomorrow')).toBe(true);
  });
});

describe('SchedulerListFilters (component)', () => {
  it('renders every filter option', async () => {
    await render(<SchedulerListFilters value="all" onChange={jest.fn()} schedulers={[]} />);
    ['Todos', 'Hoje', 'Amanhã', 'Desativados'].forEach((label) => {
      expect(screen.getByText(label)).toBeTruthy();
    });
  });

  it('calls onChange with the pressed filter value', async () => {
    const onChange = jest.fn();
    await render(<SchedulerListFilters value="all" onChange={onChange} schedulers={[]} />);

    await fireEvent.press(screen.getByText('Desativados'));

    expect(onChange).toHaveBeenCalledWith('disabled');
  });

  it('shows a count badge next to each filter, matching how many schedulers fall into it', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-03-11T10:00:00')); // Wednesday
    const schedulers = [
      makeScheduler({ enabled: true, weekDays: ['wednesday'] }), // today
      makeScheduler({ enabled: false }), // disabled
      makeScheduler({ enabled: false }), // disabled
    ];

    await render(<SchedulerListFilters value="all" onChange={jest.fn()} schedulers={schedulers} />);

    expect(screen.getByText('3')).toBeTruthy(); // Todos
    expect(screen.getByText('1')).toBeTruthy(); // Hoje
    expect(screen.getByText('2')).toBeTruthy(); // Desativados

    jest.useRealTimers();
  });

  it('keeps the counters neutral, with no color per filter', async () => {
    await render(<SchedulerListFilters value="today" onChange={jest.fn()} schedulers={[]} />);

    for (const filter of ['all', 'today', 'tomorrow', 'disabled']) {
      expect(screen.getByTestId(`scheduler-filter-count-${filter}`).props.style).toEqual({ minWidth: 20, height: 20 });
    }
  });
});
