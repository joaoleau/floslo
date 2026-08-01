export interface UserDTO {
  id: string;
  username: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface UpdateUserRequestDTO {
  username?: string;
  email?: string;
  password?: string;
}
