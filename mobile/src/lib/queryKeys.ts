export const queryKeys = {
  schedulers: {
    all: ['schedulers'] as const,
    detail: (id: string) => ['schedulers', id] as const,
  },
  objects: {
    all: ['objects'] as const,
    detail: (id: string) => ['objects', id] as const,
  },
  user: {
    me: ['user', 'me'] as const,
  },
  rag: {
    bySchedulerId: (id: string) => ['rag', id] as const,
  },
  history: {
    tags: (userId: string) => ['history', 'tags', userId] as const,
    tagDetail: (userId: string, tag: string) => ['history', 'tag', userId, tag] as const,
    mistakes: (userId: string) => ['history', 'mistakes', userId] as const,
    sessions: (userId: string) => ['history', 'sessions', userId] as const,
    sessionDetail: (id: string) => ['history', 'session', id] as const,
    attemptDetail: (id: string) => ['history', 'attempt', id] as const,
  },
  userStats: {
    me: ['userStats', 'me'] as const,
  },
};
