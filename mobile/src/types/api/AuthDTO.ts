export interface RegisterRequestDTO {
  username: string;
  email: string;
  password: string;
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
