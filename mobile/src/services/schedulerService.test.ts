const mockCancelNotification = jest.fn();
const mockRequestPermission = jest.fn().mockResolvedValue(1);
const mockCreateChannel = jest.fn();
const mockCreateTriggerNotification = jest.fn();
const mockCancelAllNotifications = jest.fn();

jest.mock('@notifee/react-native', () => ({
  __esModule: true,
  default: {
    cancelNotification: (...args: unknown[]) => mockCancelNotification(...args),
    requestPermission: (...args: unknown[]) => mockRequestPermission(...args),
    createChannel: (...args: unknown[]) => mockCreateChannel(...args),
    createTriggerNotification: (...args: unknown[]) => mockCreateTriggerNotification(...args),
    cancelAllNotifications: (...args: unknown[]) => mockCancelAllNotifications(...args),
  },
  AlarmType: { SET_ALARM_CLOCK: 'SET_ALARM_CLOCK' },
  AndroidCategory: { ALARM: 'ALARM' },
  AndroidImportance: { HIGH: 'HIGH' },
  RepeatFrequency: { WEEKLY: 'WEEKLY' },
  TriggerType: { TIMESTAMP: 'TIMESTAMP' },
}));

const mockList = jest.fn();
const mockGetById = jest.fn();
const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockRemove = jest.fn();

jest.mock('@/api/scheduler', () => ({
  schedulerApi: {
    list: (...args: unknown[]) => mockList(...args),
    getById: (...args: unknown[]) => mockGetById(...args),
    create: (...args: unknown[]) => mockCreate(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    remove: (...args: unknown[]) => mockRemove(...args),
  },
}));

import { calculateNextOneOffTrigger, calculateNextTriggerForDay, schedulerService } from './schedulerService';
import { SchedulerDTO } from '@/types/api/SchedulerDTO';

const ALL_WEEK_DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function makeDTO(overrides: Partial<SchedulerDTO> = {}): SchedulerDTO {
  return {
    scheduler_id: 'sched-1',
    name: 'Revisão',
    language: 'pt',
    weekdays: [],
    start_time: '07:30',
    alarm_sound: 'chic_pop',
    object_ids: [],
    challengers: [],
    enabled: false,
    vibration: true,
    sound_enabled: true,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockRequestPermission.mockResolvedValue(1);
});

describe('calculateNextOneOffTrigger', () => {
  it('schedules for today when the target time has not passed yet', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-03-11T08:00:00'));
    const result = new Date(calculateNextOneOffTrigger('10:00'));
    expect(result.toISOString().slice(0, 10)).toBe('2026-03-11');
    expect(result.getHours()).toBe(10);
    jest.useRealTimers();
  });

  it('rolls over to tomorrow when the target time already passed today', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-03-11T12:00:00'));
    const result = new Date(calculateNextOneOffTrigger('10:00'));
    expect(result.toISOString().slice(0, 10)).toBe('2026-03-12');
    jest.useRealTimers();
  });
});

describe('calculateNextTriggerForDay', () => {
  it('picks a later day in the same week when that weekday has not happened yet', () => {
    // 2026-03-11 is a Wednesday.
    jest.useFakeTimers().setSystemTime(new Date('2026-03-11T08:00:00'));
    const result = new Date(calculateNextTriggerForDay('09:00', 'friday'));
    expect(result.toISOString().slice(0, 10)).toBe('2026-03-13');
    jest.useRealTimers();
  });

  // Regression guard for the exact bug the function's own comment warns about: when the
  // only selected weekday is *today* and today's time has already passed, the loop must
  // wrap all the way to next week's occurrence of that same day -- not silently land on
  // some other day, and not use "now + 7 days" (which would keep today's time-of-day
  // instead of the alarm's actual HH:MM).
  it('wraps to next week when the only selected day is today and its time already passed', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-03-11T15:00:00')); // Wednesday, 15:00
    const result = new Date(calculateNextTriggerForDay('09:00', 'wednesday'));

    expect(result.toISOString().slice(0, 10)).toBe('2026-03-18'); // next Wednesday
    expect(result.getHours()).toBe(9);
    expect(result.getMinutes()).toBe(0);
    jest.useRealTimers();
  });

  it('schedules later today when the selected day is today and its time has not passed', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-03-11T08:00:00'));
    const result = new Date(calculateNextTriggerForDay('20:00', 'wednesday'));
    expect(result.toISOString().slice(0, 10)).toBe('2026-03-11');
    jest.useRealTimers();
  });
});

describe('schedulerService.getAll', () => {
  it('maps every scheduler returned by the API to its domain shape', async () => {
    mockList.mockResolvedValue({ schedulers: [makeDTO({ scheduler_id: 'sched-1' }), makeDTO({ scheduler_id: 'sched-2' })] });

    const result = await schedulerService.getAll();

    expect(result.map((s) => s.id)).toEqual(['sched-1', 'sched-2']);
  });
});

describe('schedulerService.getById', () => {
  it('returns the mapped scheduler on success', async () => {
    mockGetById.mockResolvedValue(makeDTO({ scheduler_id: 'sched-1' }));

    const result = await schedulerService.getById('sched-1');

    expect(result?.id).toBe('sched-1');
  });

  it('swallows API errors and returns undefined instead of throwing', async () => {
    // getById logs the swallowed error via console.warn -- expected here, so silence it
    // instead of letting it print as noise in the test run.
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockGetById.mockRejectedValue(new Error('not found'));

    const result = await schedulerService.getById('missing');

    expect(result).toBeUndefined();
    warnSpy.mockRestore();
  });
});

describe('schedulerService.toggleStatus', () => {
  it('updates the enabled flag via the API and cancels any stale native triggers when disabling', async () => {
    mockUpdate.mockResolvedValue(makeDTO({ scheduler_id: 'sched-1', enabled: false }));

    const result = await schedulerService.toggleStatus('sched-1', false);

    expect(mockUpdate).toHaveBeenCalledWith('sched-1', { enabled: false });
    expect(result.enabled).toBe(false);
    // Disabling wipes every id this scheduler could own (the one-off id + all 7 weekday ids)
    // and creates nothing new.
    expect(mockCancelNotification).toHaveBeenCalledTimes(1 + ALL_WEEK_DAYS.length);
    expect(mockCreateTriggerNotification).not.toHaveBeenCalled();
  });

  it('creates a one-off native trigger when enabling a scheduler with no weekdays selected', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-03-11T08:00:00'));
    mockUpdate.mockResolvedValue(makeDTO({ scheduler_id: 'sched-1', enabled: true, weekdays: [], start_time: '10:00' }));

    await schedulerService.toggleStatus('sched-1', true);

    expect(mockCreateChannel).toHaveBeenCalledTimes(1);
    expect(mockCreateTriggerNotification).toHaveBeenCalledTimes(1);
    const [notification] = mockCreateTriggerNotification.mock.calls[0];
    expect(notification.id).toBe('sched-1');
    jest.useRealTimers();
  });

  it('creates one weekly trigger per selected weekday when enabling', async () => {
    mockUpdate.mockResolvedValue(
      makeDTO({ scheduler_id: 'sched-1', enabled: true, weekdays: ['MON', 'WED'], start_time: '10:00' })
    );

    await schedulerService.toggleStatus('sched-1', true);

    expect(mockCreateTriggerNotification).toHaveBeenCalledTimes(2);
    const ids = mockCreateTriggerNotification.mock.calls.map(([notification]) => notification.id);
    expect(ids).toEqual(['sched-1__monday', 'sched-1__wednesday']);
  });
});

describe('schedulerService.create', () => {
  it('sends the DTO shape to the API and returns the mapped, native-synced scheduler', async () => {
    mockCreate.mockResolvedValue(makeDTO({ scheduler_id: 'new-id', enabled: false }));

    const result = await schedulerService.create({
      id: '',
      name: 'Nova Revisão',
      language: 'pt',
      weekDays: [],
      startTime: '08:00',
      alarmSound: 'chic_pop',
      objectIds: [],
      challengers: [],
      enabled: false,
      vibration: true,
      soundEnabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ name: 'Nova Revisão', start_time: '08:00' }));
    expect(result.id).toBe('new-id');
  });
});

describe('schedulerService.update', () => {
  it('sends the update DTO shape to the API and re-syncs native triggers', async () => {
    mockUpdate.mockResolvedValue(makeDTO({ scheduler_id: 'sched-1', name: 'Renomeado', enabled: false }));

    const result = await schedulerService.update('sched-1', {
      id: 'sched-1',
      name: 'Renomeado',
      language: 'pt',
      weekDays: [],
      startTime: '08:00',
      alarmSound: 'chic_pop',
      objectIds: [],
      challengers: [],
      enabled: false,
      vibration: true,
      soundEnabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    expect(mockUpdate).toHaveBeenCalledWith('sched-1', expect.objectContaining({ name: 'Renomeado' }));
    expect(result.name).toBe('Renomeado');
  });
});

describe('schedulerService.deleteScheduler', () => {
  it('removes the scheduler via the API and cancels every native id it could own', async () => {
    mockRemove.mockResolvedValue(undefined);

    await schedulerService.deleteScheduler('sched-1');

    expect(mockRemove).toHaveBeenCalledWith('sched-1');
    expect(mockCancelNotification).toHaveBeenCalledTimes(1 + ALL_WEEK_DAYS.length);
    expect(mockCancelNotification).toHaveBeenCalledWith('sched-1');
    for (const day of ALL_WEEK_DAYS) {
      expect(mockCancelNotification).toHaveBeenCalledWith(`sched-1__${day}`);
    }
  });
});

describe('schedulerService.resyncAll', () => {
  it('only re-syncs native triggers for enabled schedulers', async () => {
    mockList.mockResolvedValue({
      schedulers: [
        makeDTO({ scheduler_id: 'on-1', enabled: true, weekdays: [] }),
        makeDTO({ scheduler_id: 'off-1', enabled: false }),
      ],
    });

    await schedulerService.resyncAll();

    // Each scheduler's sync starts by canceling its own ids; only the enabled one goes on
    // to actually create a trigger.
    expect(mockCreateTriggerNotification).toHaveBeenCalledTimes(1);
    const [notification] = mockCreateTriggerNotification.mock.calls[0];
    expect(notification.id).toBe('on-1');
  });
});

describe('schedulerService.cancelAllNativeAlarms', () => {
  it('delegates straight to notifee.cancelAllNotifications', async () => {
    await schedulerService.cancelAllNativeAlarms();
    expect(mockCancelAllNotifications).toHaveBeenCalledTimes(1);
  });
});
