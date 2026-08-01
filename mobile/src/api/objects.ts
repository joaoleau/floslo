import { ListObjectsResponseDTO, ObjectDTO, UpdateObjectTagsRequestDTO } from '@/types/api/ObjectDTO';
import { api } from './http/client';

export const objectsApi = {
  list() {
    return api.get<ListObjectsResponseDTO>('/api/objects');
  },

  getById(id: string) {
    return api.get<ObjectDTO>(`/api/objects/${id}`);
  },

  updateTags(id: string, tags: string[]) {
    const body: UpdateObjectTagsRequestDTO = { tags };
    return api.put<ObjectDTO>(`/api/objects/${id}/tags`, body);
  },

  remove(id: string) {
    return api.delete<{ message: string }>(`/api/objects/${id}`);
  },
};
