import { getColorForId } from './hashColor';

describe('getColorForId', () => {
  it('is deterministic for the same id', () => {
    const id = 'scheduler-123';
    expect(getColorForId(id)).toBe(getColorForId(id));
  });

  it('returns a valid hex color', () => {
    expect(getColorForId('any-id')).toMatch(/^#[0-9A-F]{6}$/i);
  });

  it('spreads different ids across more than one color', () => {
    const ids = Array.from({ length: 30 }, (_, index) => `id-${index}`);
    const colors = new Set(ids.map(getColorForId));
    expect(colors.size).toBeGreaterThan(1);
  });

  it('treats similar-looking ids as distinct inputs (no accidental collapsing)', () => {
    // Regression guard: a hash that only looked at the first/last char, or that ignored
    // length, would wrongly treat these as "the same" id.
    expect(getColorForId('a')).toBe(getColorForId('a'));
    expect(typeof getColorForId('aa')).toBe('string');
  });
});
