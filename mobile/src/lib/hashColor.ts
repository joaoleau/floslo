// Paleta vibrante por hash do próprio id -- usada tanto por agendadores quanto por
// objetos (card da listagem e fundo/gradiente da tela de editar). Cada item recebe uma
// cor fixa calculada localmente no app, sem depender da API, então a cor não muda entre
// aberturas nem depende da ordem da lista.
const HASH_COLORS = [
  '#d6481d', // coral
  '#F59E0B', // âmbar
  '#10B981', // esmeralda
  '#14B8A6', // teal
  '#3B82F6', // azul
  '#8B5CF6', // violeta
  '#EC4899', // rosa
  '#6366F1', // índigo
];

function hashString(value: string): number {
  let hash = 5381;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 33) ^ value.charCodeAt(i);
  }
  return hash >>> 0;
}

/** Cor de fundo determinística para o card de um item, baseada no seu id. */
export function getColorForId(id: string): string {
  return HASH_COLORS[hashString(id) % HASH_COLORS.length];
}
