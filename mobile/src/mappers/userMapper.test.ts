import { userMapper } from './userMapper';

const base = {
  id: 'u1',
  username: 'joao',
  email: 'joao@example.com',
  current_streak: 3,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-02T00:00:00.000Z',
};

describe('userMapper.toDomain', () => {
  it('carries the last study day', () => {
    expect(userMapper.toDomain({ ...base, last_active_date: '2026-10-24' }).lastActiveDate).toBe('2026-10-24');
  });

  it('treats a missing or empty last study day as none', () => {
    expect(userMapper.toDomain(base).lastActiveDate).toBeNull();
    expect(userMapper.toDomain({ ...base, last_active_date: '' }).lastActiveDate).toBeNull();
  });
});
