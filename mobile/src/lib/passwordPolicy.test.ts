import { checkPasswordRequirements, isPasswordValid } from './passwordPolicy';

describe('checkPasswordRequirements', () => {
  it('flags every requirement as unmet for an empty password', () => {
    const result = checkPasswordRequirements('');
    expect(result.every((req) => !req.met)).toBe(true);
  });

  it('marks minLength unmet below 8 characters, met at 8 or more', () => {
    expect(checkPasswordRequirements('abc123').find((r) => r.key === 'minLength')?.met).toBe(false);
    expect(checkPasswordRequirements('abcd1234').find((r) => r.key === 'minLength')?.met).toBe(true);
  });

  it('requires at least one letter and one number independently', () => {
    expect(checkPasswordRequirements('12345678').find((r) => r.key === 'hasLetter')?.met).toBe(false);
    expect(checkPasswordRequirements('abcdefgh').find((r) => r.key === 'hasNumber')?.met).toBe(false);
    expect(checkPasswordRequirements('abcd1234').find((r) => r.key === 'hasLetter')?.met).toBe(true);
    expect(checkPasswordRequirements('abcd1234').find((r) => r.key === 'hasNumber')?.met).toBe(true);
  });
});

describe('isPasswordValid', () => {
  it('is true only when every requirement is met', () => {
    expect(isPasswordValid('abcd1234')).toBe(true);
    expect(isPasswordValid('abcdefgh')).toBe(false);
    expect(isPasswordValid('1234567')).toBe(false);
  });
});
