export interface UserDTO {
  id: string;
  username: string;
  email: string;
  current_streak: number;
  // Último dia de estudo (YYYY-MM-DD); vazio quando o usuário ainda não estudou.
  last_active_date?: string;
  created_at: string;
  updated_at: string;
}

// E-mail não é editável (decisão de produto) -- só apelido e senha.
export interface UpdateUserRequestDTO {
  username?: string;
  password?: string;
  current_password?: string;
}

