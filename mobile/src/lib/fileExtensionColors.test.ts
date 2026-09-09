import { getExtensionColor } from './fileExtensionColors';

describe('getExtensionColor', () => {
  it('returns the same color for a known extension regardless of case or leading dot', () => {
    const expected = getExtensionColor('pdf');
    expect(getExtensionColor('PDF')).toBe(expected);
    expect(getExtensionColor('.pdf')).toBe(expected);
    expect(getExtensionColor('.PDF')).toBe(expected);
  });

  it('gives different families of files visibly different colors', () => {
    expect(getExtensionColor('pdf')).not.toBe(getExtensionColor('docx'));
    expect(getExtensionColor('pdf')).not.toBe(getExtensionColor('mp3'));
    expect(getExtensionColor('jpg')).toBe(getExtensionColor('png'));
  });

  it('falls back to a default color for unknown extensions instead of throwing', () => {
    expect(() => getExtensionColor('xyz-unknown')).not.toThrow();
    expect(getExtensionColor('xyz-unknown')).toMatch(/^#[0-9A-F]{6}$/i);
  });
});
