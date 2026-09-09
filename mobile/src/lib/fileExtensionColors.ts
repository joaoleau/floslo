// Cor semântica por tipo de arquivo (convenção comum de ícone de documento), usada na
// badge de extensão do ObjectCard -- independente da cor de fundo do card (essa vem do
// hash do id, ver hashColor.ts), então o mesmo tipo de arquivo sempre tem a mesma cor,
// não importa em qual objeto apareça.
const EXTENSION_COLORS: Record<string, string> = {
  pdf: '#EF4444',
  doc: '#2563EB',
  docx: '#2563EB',
  ppt: '#EA580C',
  pptx: '#EA580C',
  xls: '#16A34A',
  xlsx: '#16A34A',
  csv: '#16A34A',
  txt: '#64748B',
  md: '#64748B',
  jpg: '#7C3AED',
  jpeg: '#7C3AED',
  png: '#7C3AED',
  gif: '#7C3AED',
  webp: '#7C3AED',
  mp3: '#DB2777',
  wav: '#DB2777',
  m4a: '#DB2777',
  mp4: '#0891B2',
  mov: '#0891B2',
};

const DEFAULT_EXTENSION_COLOR = '#6B7280';

export function getExtensionColor(extension: string): string {
  const key = extension.replace(/^\./, '').toLowerCase();
  return EXTENSION_COLORS[key] ?? DEFAULT_EXTENSION_COLOR;
}
