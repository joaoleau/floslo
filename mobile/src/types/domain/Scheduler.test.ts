import {
  CHALLENGE_TYPE_ORDER,
  Challenger,
  MAX_ITEMS_PER_SCHEDULER,
  challengerCount,
  challengerItemCount,
  makeChallenger,
  totalItemCount,
  withChallengerCount,
} from './Scheduler';

const multipleChoice = (questionCount: number): Challenger => ({ challengeType: 'MULTIPLE_CHOICE', challenge: { questionCount } });
const trueFalse = (questionCount: number): Challenger => ({ challengeType: 'TRUE_FALSE', challenge: { questionCount } });
const discovery = (discoveryCount: number): Challenger => ({ challengeType: 'DISCOVERY', challenge: { discoveryCount } });

describe('challengerItemCount', () => {
  it('reads the count of every challenge type', () => {
    expect(challengerItemCount(multipleChoice(3))).toBe(3);
    expect(challengerItemCount(trueFalse(2))).toBe(2);
    expect(challengerItemCount(discovery(1))).toBe(1);
  });
});

describe('totalItemCount', () => {
  it('sums the items across all challengers', () => {
    expect(totalItemCount([multipleChoice(3), trueFalse(6), discovery(1)])).toBe(10);
  });

  it('is zero without challengers', () => {
    expect(totalItemCount([])).toBe(0);
  });
});

describe('MAX_ITEMS_PER_SCHEDULER', () => {
  it('matches the backend limit of 10 items per scheduler', () => {
    expect(MAX_ITEMS_PER_SCHEDULER).toBe(10);
  });
});

describe('makeChallenger', () => {
  it('builds the challenge shape of each type with the requested count', () => {
    expect(makeChallenger('MULTIPLE_CHOICE', 3)).toEqual(multipleChoice(3));
    expect(makeChallenger('TRUE_FALSE', 2)).toEqual(trueFalse(2));
    expect(makeChallenger('DISCOVERY', 1)).toEqual(discovery(1));
  });
});

describe('challengerCount', () => {
  it('reads the count of one type and is zero when the type is absent', () => {
    const list = [multipleChoice(3), trueFalse(2)];
    expect(challengerCount(list, 'MULTIPLE_CHOICE')).toBe(3);
    expect(challengerCount(list, 'TRUE_FALSE')).toBe(2);
    expect(challengerCount(list, 'DISCOVERY')).toBe(0);
  });

  it('sums duplicated challengers of the same type', () => {
    expect(challengerCount([multipleChoice(2), multipleChoice(3)], 'MULTIPLE_CHOICE')).toBe(5);
  });
});

describe('withChallengerCount', () => {
  it('adds a type that was not there, keeping the fixed order', () => {
    const result = withChallengerCount([trueFalse(2), multipleChoice(1)], 'DISCOVERY', 3);
    expect(result).toEqual([multipleChoice(1), trueFalse(2), discovery(3)]);
    expect(CHALLENGE_TYPE_ORDER).toEqual(['MULTIPLE_CHOICE', 'TRUE_FALSE', 'DISCOVERY']);
  });

  it('changes only the count of the given type', () => {
    expect(withChallengerCount([multipleChoice(1), trueFalse(2)], 'MULTIPLE_CHOICE', 5)).toEqual([multipleChoice(5), trueFalse(2)]);
  });

  it('removes the type when the count is zero', () => {
    expect(withChallengerCount([multipleChoice(1), trueFalse(2)], 'MULTIPLE_CHOICE', 0)).toEqual([trueFalse(2)]);
  });

  it('merges duplicated challengers of the other types into one', () => {
    expect(withChallengerCount([multipleChoice(2), multipleChoice(3), discovery(1)], 'DISCOVERY', 4)).toEqual([multipleChoice(5), discovery(4)]);
  });

  it('does not change the list it received', () => {
    const list = [multipleChoice(1)];
    withChallengerCount(list, 'MULTIPLE_CHOICE', 4);
    expect(list).toEqual([multipleChoice(1)]);
  });
});
