export interface ObjectDTO {
  id: string;
  name: string;
  tags: string[];
  language: string;
  created_at: string;
  updated_at: string;
}

export interface ListObjectsResponseDTO {
  objects: ObjectDTO[];
}

export interface UpdateObjectTagsRequestDTO {
  tags: string[];
}
