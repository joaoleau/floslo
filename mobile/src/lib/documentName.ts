export function documentName(objectKey: string): string {
  return objectKey.slice(objectKey.lastIndexOf('/') + 1);
}
