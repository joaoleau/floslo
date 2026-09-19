// Cor da borda inferior usada no efeito "luz vindo de cima" dos cards (ver ui/card.tsx,
// SchedulerCard, ObjectCard) -- escurece o "chão" no modo light, e no modo dark (onde já é
// escuro por padrão) vira um filete mais claro, que é como apps escuros costumam sugerir
// elevação. Centralizado aqui pra não repetir o mesmo par de valores em cada lugar que usa
// o efeito fora do componente Card compartilhado (linhas de lista que funcionam como
// mini-cards, ex.: TagAccuracyRow, linhas de sessão/erro do Histórico).
export function getCardEdgeColor(mode: 'light' | 'dark'): string {
  return mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.15)';
}
