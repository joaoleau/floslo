import { todayLocalDate } from './localDate';

describe('todayLocalDate', () => {
  it('formats the local day as YYYY-MM-DD with zero padding', () => {
    expect(todayLocalDate(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });

  it('uses the local calendar day, not the UTC one', () => {
    const lateNight = new Date(2026, 9, 25, 23, 30);
    expect(todayLocalDate(lateNight)).toBe('2026-10-25');
  });
});
