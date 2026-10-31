const HASH_COLORS = [
  '#d6481d',
  '#F59E0B',
  '#10B981',
  '#14B8A6',
  '#3B82F6',
  '#8B5CF6',
  '#EC4899',
  '#6366F1',
];

function hashString(value: string): number {
  let hash = 5381;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 33) ^ value.charCodeAt(i);
  }
  return hash >>> 0;
}

export function getColorForId(id: string): string {
  return HASH_COLORS[hashString(id) % HASH_COLORS.length];
}
