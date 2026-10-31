import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const mockGetBySchedulerId = jest.fn();
jest.mock('@/services/firingService', () => ({
  firingService: { getBySchedulerId: (...args: unknown[]) => mockGetBySchedulerId(...args) },
}));

import { useRagQuery } from './useFiring';
import { queryKeys } from '@/lib/queryKeys';

function wrapperFor(client: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client }, children);
  };
}

describe('useRagQuery', () => {
  it('never starts a firing with the challenges of the previous one', async () => {
    const client = new QueryClient();
    mockGetBySchedulerId.mockResolvedValueOnce({ id: 'first' }).mockResolvedValueOnce({ id: 'second' });

    const first = await renderHook(() => useRagQuery('sched-1'), { wrapper: wrapperFor(client) });
    await waitFor(() => expect(first.result.current.data).toEqual({ id: 'first' }));
    await first.unmount();

    await waitFor(() => expect(client.getQueryData(queryKeys.rag.bySchedulerId('sched-1'))).toBeUndefined());

    const second = await renderHook(() => useRagQuery('sched-1'), { wrapper: wrapperFor(client) });
    expect(second.result.current.data).toBeUndefined();
    await waitFor(() => expect(second.result.current.data).toEqual({ id: 'second' }));
    await second.unmount();
  });

  it('does not refetch while the firing is open', async () => {
    const client = new QueryClient();
    mockGetBySchedulerId.mockReset().mockResolvedValue({ id: 'only' });

    const { result, unmount } = await renderHook(() => useRagQuery('sched-2'), { wrapper: wrapperFor(client) });
    await waitFor(() => expect(result.current.data).toEqual({ id: 'only' }));

    const query = client.getQueryCache().find({ queryKey: queryKeys.rag.bySchedulerId('sched-2') });
    expect(query?.isStale()).toBe(false);
    expect(mockGetBySchedulerId).toHaveBeenCalledTimes(1);
    await unmount();
  });
});
