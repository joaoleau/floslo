export type ObjectStatus = 'processing' | 'active' | 'failed';

export interface ObjectType {
  id: string;
  name: string;
  extension: string;
  tags: string[];
  status: ObjectStatus;
  errorMessage?: string;
}
