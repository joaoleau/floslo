import { DIFFICULTY_LABELS, DIFFICULTY_META } from './difficulty';

const EXPECTED_LEVELS = ['easy', 'medium', 'hard'] as const;

describe('DIFFICULTY_LABELS / DIFFICULTY_META', () => {
  it('has a label and a meta entry for every difficulty level', () => {
    expect(Object.keys(DIFFICULTY_LABELS).sort()).toEqual([...EXPECTED_LEVELS].sort());
    expect(Object.keys(DIFFICULTY_META).sort()).toEqual([...EXPECTED_LEVELS].sort());
  });

  it.each(EXPECTED_LEVELS)('%s has a non-empty label and a complete meta entry', (level) => {
    expect(DIFFICULTY_LABELS[level].length).toBeGreaterThan(0);
    const meta = DIFFICULTY_META[level];
    expect(meta.icon.length).toBeGreaterThan(0);
    expect(meta.color).toMatch(/^#[0-9a-f]{6}$/i);
  });
});
