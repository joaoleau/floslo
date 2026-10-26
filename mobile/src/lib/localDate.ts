// "YYYY-MM-DD" no fuso local do aparelho -- o backend não tem como saber o fuso do
// usuário sozinho, então quem manda a data local é sempre o cliente.
export function todayLocalDate(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
