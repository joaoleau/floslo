// O disparo aberto no momento (id do agendador). A notificação do alarme pode continuar na barra
// enquanto a tela de disparo carrega, e o app volta ao primeiro plano várias vezes durante um
// disparo; sem isso, cada volta encontraria o alarme e abriria uma segunda tela de disparo por
// cima da primeira, com desafios novos.
let activeSchedulerId: string | null = null;

export const activeFiring = {
  start(schedulerId: string): void {
    activeSchedulerId = schedulerId;
  },

  finish(schedulerId: string): void {
    if (activeSchedulerId === schedulerId) activeSchedulerId = null;
  },

  isOpen(schedulerId: string | null | undefined): boolean {
    return !!schedulerId && activeSchedulerId === schedulerId;
  },
};
