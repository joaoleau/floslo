import { getCardEdgeColor } from './cardEdge';

describe('getCardEdgeColor', () => {
  it('darkens the edge in light mode', () => {
    expect(getCardEdgeColor('light')).toBe('rgba(0,0,0,0.15)');
  });

  it('lightens the edge in dark mode instead', () => {
    expect(getCardEdgeColor('dark')).toBe('rgba(255,255,255,0.08)');
  });
});
