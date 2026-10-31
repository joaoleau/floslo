export interface PasswordRequirement {
  key: 'minLength' | 'hasLetter' | 'hasNumber';
  met: boolean;
}

export function checkPasswordRequirements(password: string): PasswordRequirement[] {
  return [
    { key: 'minLength', met: password.length >= 8 },
    { key: 'hasLetter', met: /[a-zA-Z]/.test(password) },
    { key: 'hasNumber', met: /[0-9]/.test(password) },
  ];
}

export function isPasswordValid(password: string): boolean {
  return checkPasswordRequirements(password).every((req) => req.met);
}
