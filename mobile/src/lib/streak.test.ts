import { displayedStreak } from './streak';

describe('displayedStreak', () => {
  const now = new Date(2026, 9, 25, 9, 0); // 25/10/2026, local

  it('keeps the streak when the last study day is today', () => {
    expect(displayedStreak(4, '2026-10-25', now)).toBe(4);
  });

  it('keeps the streak when the last study day is yesterday, since today can still extend it', () => {
    expect(displayedStreak(4, '2026-10-24', now)).toBe(4);
  });

  it('shows 0 when more than a day went by without studying', () => {
    expect(displayedStreak(4, '2026-10-23', now)).toBe(0);
  });

  it('handles the turn of the month and of the year', () => {
    expect(displayedStreak(2, '2026-09-30', new Date(2026, 9, 1, 8, 0))).toBe(2);
    expect(displayedStreak(2, '2025-12-31', new Date(2026, 0, 1, 8, 0))).toBe(2);
    expect(displayedStreak(2, '2025-12-30', new Date(2026, 0, 1, 8, 0))).toBe(0);
  });

  it('trusts the stored value when there is no study day yet', () => {
    expect(displayedStreak(0, null, now)).toBe(0);
  });
});
