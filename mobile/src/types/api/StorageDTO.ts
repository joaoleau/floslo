export interface ObjectRequestDTO {
  object_name: string;
}

export interface PresignObjectDTO {
  url: string;
  method: string;
  signed_header: Record<string, string[]>;
}

export interface ListObjectFilenamesResponseDTO {
  objects: string[];
}
