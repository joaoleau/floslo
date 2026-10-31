export interface RegisterRequestDTO {
  username: string;
  email: string;
  password: string;
  accepted_terms_version: string;
}

export interface RegisterResponseDTO {
  message: string;
}

export interface LoginRequestDTO {
  username: string;
  password: string;
}

export interface LoginResponseDTO {
  token: string;
  refresh_token: string;
}

export interface RefreshTokenRequestDTO {
  refresh_token: string;
}

export interface RefreshTokenResponseDTO {
  token: string;
}

export interface ForgotPasswordRequestDTO {
  email: string;
}

export interface VerifyResetCodeRequestDTO {
  email: string;
  code: string;
}

export interface ResetPasswordRequestDTO {
  email: string;
  code: string;
  new_password: string;
}

export interface MessageResponseDTO {
  message: string;
}
