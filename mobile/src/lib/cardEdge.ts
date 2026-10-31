export function getCardEdgeColor(mode: 'light' | 'dark'): string {
  return mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.15)';
}
