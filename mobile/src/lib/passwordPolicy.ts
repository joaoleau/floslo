// Espelha a política aplicada no backend (internal/service/auth.go's
// ValidatePasswordStrength) -- mínimo 8 caracteres, pelo menos 1 letra e 1 número.
// Validar aqui também é só UX (feedback imediato); o backend é quem garante de verdade,
// já que validação só no app pode ser contornada direto na API.
// O texto de cada requisito fica no dicionário, em auth.passwordRules.<key>.
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
