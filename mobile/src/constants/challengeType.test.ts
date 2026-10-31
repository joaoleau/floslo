import { CHALLENGE_TYPE_META } from './challengeType';

const EXPECTED_TYPES = ['MULTIPLE_CHOICE', 'TRUE_FALSE', 'DISCOVERY'] as const;

// Regression guard for the refactor: every screen that iterates CHALLENGE_TYPE_META
// (history's mistake badges, the scheduler card's challenge chips) assumes all three
// types are present with a complete, non-empty entry -- a type added
// without updating this map would silently render as "undefined" instead of failing loudly.
describe('CHALLENGE_TYPE_META', () => {
  it('has an entry for every challenge type', () => {
    expect(Object.keys(CHALLENGE_TYPE_META).sort()).toEqual([...EXPECTED_TYPES].sort());
  });

  it.each(EXPECTED_TYPES)('%s has a non-empty icon, color and label', (type) => {
    const meta = CHALLENGE_TYPE_META[type];
    expect(meta.icon.length).toBeGreaterThan(0);
    expect(meta.label.length).toBeGreaterThan(0);
    expect(meta.color).toMatch(/^#[0-9A-F]{6}$/i);
  });

  it('gives each type a visually distinct color', () => {
    const colors = EXPECTED_TYPES.map((type) => CHALLENGE_TYPE_META[type].color.toUpperCase());
    expect(new Set(colors).size).toBe(colors.length);
  });
});
