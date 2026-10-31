export interface UserDTO {
  id: string;
  username: string;
  email: string;
  current_streak: number;
  last_active_date?: string;
  created_at: string;
  updated_at: string;
}

export interface UpdateUserRequestDTO {
  username?: string;
  password?: string;
  current_password?: string;
}
