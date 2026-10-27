// Nome do arquivo a partir da chave do S3 (tenants/<usuário>/context/<arquivo>). A API já manda
// só o nome; isto cobre as tentativas gravadas no histórico antes disso, que guardaram o caminho.
export function documentName(objectKey: string): string {
  return objectKey.slice(objectKey.lastIndexOf('/') + 1);
}
