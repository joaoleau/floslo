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

  anyOpen(): boolean {
    return activeSchedulerId !== null;
  },

  isHandled(schedulerId: string | null | undefined, now: number = Date.now()): boolean {
    if (!schedulerId) return false;
    if (activeSchedulerId === schedulerId) return true;
    const finished = finishedAt.get(schedulerId);
    return finished !== undefined && now - finished < RECENTLY_FINISHED_MS;
  },

  reset(): void {
    activeSchedulerId = null;
    finishedAt.clear();
  },
};
