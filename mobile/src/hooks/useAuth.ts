import { useMutation } from '@tanstack/react-query';
import { authService } from '@/services/authService';
import { LoginRequestDTO, RegisterRequestDTO } from '@/types/api/AuthDTO';

export function useLoginMutation() {
  return useMutation({
    mutationFn: (payload: LoginRequestDTO) => authService.login(payload),
  });
}

export function useRegisterMutation() {
  return useMutation({
    // authService.register also logs in right after, so the screen only needs one call.
    mutationFn: (payload: RegisterRequestDTO) => authService.register(payload),
  });
}

export function useResetPasswordMutation() {
  return useMutation({
    mutationFn: (email: string) => authService.resetPassword(email),
  });
}

export function useVerifyResetCodeMutation() {
  return useMutation({
    mutationFn: ({ email, code }: { email: string; code: string }) => authService.verifyResetCode(email, code),
  });
}

export function useConfirmPasswordResetMutation() {
  return useMutation({
    mutationFn: ({ email, code, newPassword }: { email: string; code: string; newPassword: string }) =>
      authService.confirmPasswordReset(email, code, newPassword),
  });
}
