export type ObjectStatusDTO = 'processing' | 'active' | 'failed';

export interface ObjectDTO {
  id: string;
  name: string;
  tags: string[];
  language: string;
  status: ObjectStatusDTO;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface ListObjectsResponseDTO {
  objects: ObjectDTO[];
}

export interface UpdateObjectTagsRequestDTO {
  tags: string[];
}

export interface UpdateObjectNameRequestDTO {
  name: string;
}
