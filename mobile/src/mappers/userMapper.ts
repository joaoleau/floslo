import { UserDTO } from '@/types/api/UserDTO';
import { User } from '@/types/domain/User';

export const userMapper = {
  toDomain(raw: UserDTO): User {
    return {
      id: raw.id,
      username: raw.username,
      email: raw.email,
      createdAt: new Date(raw.created_at),
      updatedAt: new Date(raw.updated_at),
    };
  },
};
