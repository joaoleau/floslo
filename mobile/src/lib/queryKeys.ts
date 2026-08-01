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
};
