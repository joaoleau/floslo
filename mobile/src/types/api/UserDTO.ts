export interface UserDTO {
  id: string;
  username: string;
  email: string;
  current_streak: number;
  created_at: string;
  updated_at: string;
}

// E-mail não é editável (decisão de produto) -- só apelido e senha.
export interface UpdateUserRequestDTO {
  username?: string;
  password?: string;
  current_password?: string;
}

export interface RecordStreakRequestDTO {
  local_date: string;
}

export interface RecordStreakResponseDTO {
  current_streak: number;
}
