import { userApi } from '@/api/user';
import { userMapper } from '@/mappers/userMapper';
import { UpdateUserRequestDTO } from '@/types/api/UserDTO';
import { User } from '@/types/domain/User';

export const userService = {
  async getMe(): Promise<User> {
    const raw = await userApi.getMe();
    return userMapper.toDomain(raw);
  },

  async updateMe(payload: UpdateUserRequestDTO): Promise<User> {
    console.log('[User] Atualizando perfil', payload);
    const raw = await userApi.updateMe(payload);
    return userMapper.toDomain(raw);
  },

  async deleteMe(): Promise<void> {
    console.log('[User] Excluindo conta');
    await userApi.deleteMe();
  },

  async recordStreak(localDate: string): Promise<number> {
    const { current_streak } = await userApi.recordStreak({ local_date: localDate });
    return current_streak;
  },
};
