import { ObjectDTO } from '@/types/api/ObjectDTO';
import { ObjectType } from '@/types/domain/Object';

function parseExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  return lastDot > 0 ? filename.slice(lastDot + 1) : '';
}

function parseBaseName(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  return lastDot > 0 ? filename.slice(0, lastDot) : filename;
}

export const objectMapper = {
  toDomain(raw: ObjectDTO): ObjectType {
    return {
      id: raw.id,
      name: parseBaseName(raw.name),
      extension: parseExtension(raw.name),
      tags: raw.tags ?? [],
    };
  },
};
