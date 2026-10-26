import { activeFiring } from './activeFiring';

describe('activeFiring', () => {
  afterEach(() => activeFiring.reset());

  it('reports the firing that is open', () => {
    activeFiring.start('sched-1');
    expect(activeFiring.isOpen('sched-1')).toBe(true);
    expect(activeFiring.isOpen('sched-2')).toBe(false);
    expect(activeFiring.isHandled('sched-1')).toBe(true);
  });

  it('a firing that finishes does not close another one that opened later', () => {
    activeFiring.start('sched-2');
    activeFiring.finish('sched-1');
    expect(activeFiring.isOpen('sched-2')).toBe(true);
  });

  it('keeps ignoring an alarm for a while after it was answered', () => {
    activeFiring.start('sched-1');
    activeFiring.finish('sched-1', 1_000);

    expect(activeFiring.isOpen('sched-1')).toBe(false);
    expect(activeFiring.isHandled('sched-1', 1_000 + 4 * 60 * 1000)).toBe(true);
    expect(activeFiring.isHandled('sched-1', 1_000 + 11 * 60 * 1000)).toBe(false);
  });

  it('does not ignore the alarm of another scheduler', () => {
    activeFiring.finish('sched-1', 1_000);
    expect(activeFiring.isHandled('sched-2', 2_000)).toBe(false);
  });

  it('never matches an empty id', () => {
    expect(activeFiring.isOpen(undefined)).toBe(false);
    expect(activeFiring.isHandled('')).toBe(false);
  });
});
