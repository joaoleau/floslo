// O disparo aberto no momento (id do agendador), e os que acabaram de ser respondidos. A
// notificação do alarme pode continuar na barra enquanto a tela de disparo carrega, e o app
// volta ao primeiro plano várias vezes durante e depois de um disparo; sem isso, cada volta
// poderia encontrar o mesmo alarme (a notificação que abriu o app, ou o toque guardado pelo
// onBackgroundEvent) e abrir outra tela de disparo, com desafios novos.

// Por quanto tempo um alarme já respondido é ignorado. Um mesmo agendador só volta a tocar no
// dia seguinte (gatilho semanal por dia, ou único), então a janela não esconde um alarme novo.
const RECENTLY_FINISHED_MS = 10 * 60 * 1000;

let activeSchedulerId: string | null = null;
const finishedAt = new Map<string, number>();

export const activeFiring = {
  start(schedulerId: string): void {
    activeSchedulerId = schedulerId;
  },

  finish(schedulerId: string, now: number = Date.now()): void {
    if (activeSchedulerId === schedulerId) activeSchedulerId = null;
    finishedAt.set(schedulerId, now);
  },

  isOpen(schedulerId: string | null | undefined): boolean {
    return !!schedulerId && activeSchedulerId === schedulerId;
  },

  // Diz se este alarme já está sendo atendido ou acabou de ser respondido, e não deve abrir
  // outra tela de disparo.
  isHandled(schedulerId: string | null | undefined, now: number = Date.now()): boolean {
    if (!schedulerId) return false;
    if (activeSchedulerId === schedulerId) return true;
    const finished = finishedAt.get(schedulerId);
    return finished !== undefined && now - finished < RECENTLY_FINISHED_MS;
  },

  // Só para os testes.
  reset(): void {
    activeSchedulerId = null;
    finishedAt.clear();
  },
};
