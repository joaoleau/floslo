import { alternativeLetter, shuffle } from './shuffle';

describe('shuffle', () => {
  it('returns every item, in a new order, without touching the original list', () => {
    const items = ['certa', 'b', 'c', 'd'];
    // random sempre 0: cada posição troca com a primeira, e a certa sai do topo.
    const result = shuffle(items, () => 0);
    expect(result).toEqual(['b', 'c', 'd', 'certa']);
    expect(items).toEqual(['certa', 'b', 'c', 'd']);
  });

  it('puts the right answer in every position over many shuffles', () => {
    const positions = new Set<number>();
    for (let run = 0; run < 200; run++) {
      positions.add(shuffle(['certa', 'b', 'c', 'd']).indexOf('certa'));
    }
    expect([...positions].sort()).toEqual([0, 1, 2, 3]);
  });
});

describe('alternativeLetter', () => {
  it('labels the alternatives by position', () => {
    expect([0, 1, 2, 3].map(alternativeLetter)).toEqual(['A', 'B', 'C', 'D']);
  });
});
