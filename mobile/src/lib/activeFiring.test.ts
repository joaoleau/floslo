import { activeFiring } from './activeFiring';

describe('activeFiring', () => {
  afterEach(() => activeFiring.finish('sched-1'));

  it('reports the firing that is open', () => {
    activeFiring.start('sched-1');
    expect(activeFiring.isOpen('sched-1')).toBe(true);
    expect(activeFiring.isOpen('sched-2')).toBe(false);
  });

  it('forgets the firing once it finishes', () => {
    activeFiring.start('sched-1');
    activeFiring.finish('sched-1');
    expect(activeFiring.isOpen('sched-1')).toBe(false);
  });

  it('a firing that finishes does not close another one that opened later', () => {
    activeFiring.start('sched-2');
    activeFiring.finish('sched-1');
    expect(activeFiring.isOpen('sched-2')).toBe(true);
    activeFiring.finish('sched-2');
  });

  it('never matches an empty id', () => {
    expect(activeFiring.isOpen(undefined)).toBe(false);
    expect(activeFiring.isOpen('')).toBe(false);
  });
});
