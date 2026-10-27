import { documentName } from './documentName';

describe('documentName', () => {
  it('drops the tenant path from an S3 key', () => {
    expect(documentName('tenants/usr_61d38e8d/context/biologia.pdf')).toBe('biologia.pdf');
  });

  it('keeps a plain file name as it is', () => {
    expect(documentName('biologia.pdf')).toBe('biologia.pdf');
  });
});
