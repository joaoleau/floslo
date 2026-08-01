import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { userService } from '@/services/userService';
import { UpdateUserRequestDTO } from '@/types/api/UserDTO';

export function useMeQuery() {
  return useQuery({ queryKey: queryKeys.user.me, queryFn: userService.getMe });
}

export function useUpdateMeMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateUserRequestDTO) => userService.updateMe(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.user.me }),
  });
}

export function useDeleteMeMutation() {
  return useMutation({
    mutationFn: () => userService.deleteMe(),
  });
}
