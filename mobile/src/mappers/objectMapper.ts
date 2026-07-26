import { ObjectDTO } from '@/types/api/ObjectDTO';
import { ObjectType } from '@/types/domain/Object';

export const objectMapper = {
  toDomain(raw: ObjectDTO): ObjectType {
    return {
      id: raw.id,
      name: raw.name,
      extension: raw.extension,
      tags: raw.tags,
    };
  },

  toDTO(domain: ObjectType): ObjectDTO {
    return {
      id: domain.id,
      name: domain.name,
      extension: domain.extension,
      tags: domain.tags,
    };
  },
};
