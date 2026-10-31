import { sessionScoreLabel } from './sessionScore';

describe('sessionScoreLabel', () => {
  it('leaves discoveries out of the first-try score', () => {
    expect(sessionScoreLabel({ answeredCount: 6, gradedCount: 2, correctCount: 2 })).toBe(
      '2/2 de primeira • 4 descobertas'
    );
  });

  it('shows only the score when there are no discoveries', () => {
    expect(sessionScoreLabel({ answeredCount: 3, gradedCount: 3, correctCount: 1 })).toBe('1/3 de primeira');
  });

  it('shows only the discoveries when no question has a right answer', () => {
    expect(sessionScoreLabel({ answeredCount: 1, gradedCount: 0, correctCount: 0 })).toBe('1 descoberta');
  });

  it('says nothing was answered for an empty session', () => {
    expect(sessionScoreLabel({ answeredCount: 0, gradedCount: 0, correctCount: 0 })).toBe('Nenhum desafio respondido');
  });
});
