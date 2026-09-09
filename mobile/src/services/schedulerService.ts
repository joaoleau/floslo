import notifee, {
  AlarmType,
  AndroidCategory,
  AndroidImportance,
  RepeatFrequency,
  TimestampTrigger,
  TriggerType,
} from '@notifee/react-native';

import { schedulerApi } from '@/api/scheduler';
import { schedulerMapper } from '@/mappers/schedulerMapper';
import { Scheduler } from '@/types/domain/Scheduler';

// ============================================================================
// NATIVE HELPER FUNCTIONS
// ============================================================================

const ALL_WEEK_DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

const JS_DAY_TO_STRING: Record<number, string> = {
  0: 'sunday',
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday',
};

/** Next one-off timestamp for schedulers with no weekDays selected (fires once). */
export function calculateNextOneOffTrigger(startTime: string): number {
  const [targetHours, targetMinutes] = startTime.split(':').map(Number);
  const now = new Date();

  const triggerDate = new Date();
  triggerDate.setHours(targetHours, targetMinutes, 0, 0);
  if (triggerDate.getTime() <= now.getTime()) {
    triggerDate.setDate(triggerDate.getDate() + 1);
  }
  return triggerDate.getTime();
}

/** Next timestamp (today or up to 7 days out) that lands on the given weekday. */
export function calculateNextTriggerForDay(startTime: string, day: string): number {
  const [targetHours, targetMinutes] = startTime.split(':').map(Number);
  const now = new Date();

  // Must go up to i=7 (a full 8-iteration span), not just i<7: when the only selected day is
  // today and today's target time has already passed, i=0..6 never finds a valid future match
  // (today fails the >now check, and no other day-of-name recurs within 6 more days) — i=7
  // lands back on the same weekday, now safely in the future. Without this, syncing (e.g. on
  // every edit) fell through to a `now + 7 days` fallback that used the CURRENT time-of-day
  // instead of the alarm's actual HH:MM, silently shifting when the alarm would ring.
  for (let i = 0; i <= 7; i++) {
    const candidateDate = new Date();
    candidateDate.setDate(now.getDate() + i);
    candidateDate.setHours(targetHours, targetMinutes, 0, 0);

    if (JS_DAY_TO_STRING[candidateDate.getDay()] === day && candidateDate.getTime() > now.getTime()) {
      return candidateDate.getTime();
    }
  }

  // Truly unreachable now (i=7 always lands back on `day` with the correct time, which is
  // always > now), kept only so the function has a total return type.
  return now.getTime() + 7 * 24 * 60 * 60 * 1000;
}

/**
 * A single TimestampTrigger only ever fires once (or repeats on a fixed cadence from that
 * one timestamp) — it can't represent "every Monday AND every Tuesday" on its own. So a
 * multi-weekday alarm is modeled as one WEEKLY-repeating trigger notification per selected
 * day, each with its own id, instead of a single trigger for whichever day comes first.
 */
function dayNotificationId(schedulerId: string, day: string): string {
  return `${schedulerId}__${day}`;
}

/**
 * Cancels every notification id this scheduler could possibly have scheduled — the one-off
 * id plus all 7 per-weekday ids — regardless of which ones actually exist. Canceling a
 * nonexistent id is a safe no-op, so this is the simplest way to guarantee no stale trigger
 * survives an edit (e.g. unchecking a weekday, or disabling the alarm) without having to
 * track which ids were previously created.
 */
async function cancelAllForScheduler(schedulerId: string): Promise<void> {
  try {
    await Promise.all([
      notifee.cancelNotification(schedulerId),
      ...ALL_WEEK_DAYS.map((day) => notifee.cancelNotification(dayNotificationId(schedulerId, day))),
    ]);
  } catch (err) {
    console.error(`[Scheduler][native] Falha ao cancelar notificações do alarme ${schedulerId}`, err);
  }
}

/** Communicates with Android to schedule or cancel the notification */
async function syncWithAndroid(scheduler: Scheduler) {
  console.log(`[Scheduler][native] Sincronizando "${scheduler.name}" (${scheduler.id})`, {
    enabled: scheduler.enabled,
    weekDays: scheduler.weekDays,
    startTime: scheduler.startTime,
  });

  // Always clear every id this scheduler could own first — otherwise editing weekdays
  // (e.g. removing Tuesday) leaves the old Tuesday trigger scheduled forever, and it'll
  // still go off next Tuesday even though the alarm no longer says Tuesday.
  await cancelAllForScheduler(scheduler.id);

  if (!scheduler.enabled) {
    console.log(`[Scheduler][native] "${scheduler.name}" está desabilitado, nenhum trigger criado`);
    return;
  }

  const permission = await notifee.requestPermission();
  console.log('[Scheduler][native] Permissão de notificação', permission);

  // Sound name must be lowercase, no spaces, matching the raw resource filename.
  const soundName = scheduler.alarmSound ? scheduler.alarmSound.toLowerCase().replace(/\s+/g, '_') : 'default';

  // Baking sound + vibration into the channel id forces Android to create a fresh
  // channel whenever either setting changes (channel settings are otherwise immutable —
  // toggling `scheduler.vibration` later would silently do nothing without this).
  const channelId = `alarm_${scheduler.id}_${soundName}_${scheduler.vibration ? 'vib' : 'novib'}`;

  await notifee.createChannel({
    id: channelId,
    name: `Canal: ${scheduler.name}`,
    importance: AndroidImportance.HIGH,
    sound: soundName,
    vibration: scheduler.vibration,
  });

  const baseNotification = {
    title: '⏰ ' + (scheduler.name || 'Agendador'),
    body: 'Seu agendador está tocando. Toque para abrir.',
    android: {
      channelId,
      category: AndroidCategory.ALARM,
      autoCancel: true,
      ongoing: false,
      loopSound: true,
      // launchActivity precisa estar aqui, igual na tela cheia do próprio firing.tsx --
      // sem ele, o Android pode simplesmente não lançar a activity automaticamente com a
      // tela bloqueada e cair de volta pra uma notificação comum (vibra + aparece, mas não
      // abre nada sozinho). Todo agendador é um alarme de verdade (acorda a tela), sem
      // opção de virar só lembrete/notificação.
      fullScreenAction: { id: 'default', launchActivity: 'default' },
      pressAction: { id: 'default', launchActivity: 'default' },
    },
  };

  try {
    if (!scheduler.weekDays || scheduler.weekDays.length === 0) {
      // No days selected: a plain one-time alarm, same as before.
      const timestamp = calculateNextOneOffTrigger(scheduler.startTime);
      const trigger: TimestampTrigger = {
        type: TriggerType.TIMESTAMP,
        timestamp,
        // SET_ALARM_CLOCK (não só `alarmManager: true`, que cai no AlarmType.SET_EXACT genérico)
        // é a mesma API que apps de despertador "de verdade" (Google Clock, Samsung Clock) usam
        // — Android isenta automaticamente esse tipo de alarme de restrições de bateria/Doze e
        // mostra o ícone de despertador na barra de status, sem depender do usuário ajustar
        // permissões manualmente.
        alarmManager: { type: AlarmType.SET_ALARM_CLOCK },
      };

      await notifee.createTriggerNotification(
        {
          ...baseNotification,
          id: scheduler.id,
          data: { schedulerId: scheduler.id },
        },
        trigger
      );
      console.log(`[Scheduler][native] Trigger único criado para "${scheduler.name}"`, new Date(timestamp).toISOString());
      return;
    }

    // One weekly-repeating trigger PER selected day, so "segunda e terça" actually means
    // "every Monday AND every Tuesday", not just whichever of the two comes first.
    await Promise.all(
      scheduler.weekDays.map((day) => {
        const timestamp = calculateNextTriggerForDay(scheduler.startTime, day);
        const trigger: TimestampTrigger = {
          type: TriggerType.TIMESTAMP,
          timestamp,
          repeatFrequency: RepeatFrequency.WEEKLY,
          // SET_ALARM_CLOCK (não só `alarmManager: true`, que cai no AlarmType.SET_EXACT genérico)
        // é a mesma API que apps de despertador "de verdade" (Google Clock, Samsung Clock) usam
        // — Android isenta automaticamente esse tipo de alarme de restrições de bateria/Doze e
        // mostra o ícone de despertador na barra de status, sem depender do usuário ajustar
        // permissões manualmente.
        alarmManager: { type: AlarmType.SET_ALARM_CLOCK },
        };

        console.log(`[Scheduler][native] Trigger semanal (${day}) criado para "${scheduler.name}"`, new Date(timestamp).toISOString());

        return notifee.createTriggerNotification(
          {
            ...baseNotification,
            id: dayNotificationId(scheduler.id, day),
            data: { schedulerId: scheduler.id },
          },
          trigger
        );
      })
    );
  } catch (err) {
    console.error(`[Scheduler][native] Falha ao criar trigger(s) nativo(s) para "${scheduler.name}" (${scheduler.id})`, err);
    throw err;
  }
}

// ============================================================================
// MAIN SCHEDULER SERVICE
// ============================================================================

export const schedulerService = {
  async getAll(): Promise<Scheduler[]> {
    const { schedulers } = await schedulerApi.list();
    return schedulers.map(schedulerMapper.toDomain);
  },

  async getById(id: string): Promise<Scheduler | undefined> {
    try {
      const raw = await schedulerApi.getById(id);
      return schedulerMapper.toDomain(raw);
    } catch (err) {
      console.warn(`[Scheduler] getById(${id}) falhou, retornando undefined`, err);
      return undefined;
    }
  },

  async toggleStatus(id: string, enabled: boolean): Promise<Scheduler> {
    console.log(`[Scheduler] Alternando "${id}" para enabled=${enabled}`);
    const updated = await schedulerApi.update(id, { enabled });
    const scheduler = schedulerMapper.toDomain(updated);
    await syncWithAndroid(scheduler);
    return scheduler;
  },

  async create(scheduler: Scheduler): Promise<Scheduler> {
    console.log(`[Scheduler] Criando "${scheduler.name}"`);
    const created = await schedulerApi.create(schedulerMapper.toDTO(scheduler));
    const mapped = schedulerMapper.toDomain(created);
    console.log(`[Scheduler] "${mapped.name}" criado com id=${mapped.id}`);
    await syncWithAndroid(mapped);
    return mapped;
  },

  async update(id: string, scheduler: Scheduler): Promise<Scheduler> {
    console.log(`[Scheduler] Atualizando "${id}"`);
    const updated = await schedulerApi.update(id, schedulerMapper.toUpdateDTO(scheduler));
    const merged = schedulerMapper.toDomain(updated);
    await syncWithAndroid(merged);
    return merged;
  },

  async deleteScheduler(id: string): Promise<void> {
    console.log(`[Scheduler] Excluindo "${id}"`);
    await schedulerApi.remove(id);
    await cancelAllForScheduler(id);
  },

  /**
   * Reconciles this device's native alarms with the backend's truth. Needed after login
   * (a fresh install/re-login has no native triggers yet even though the backend already
   * has enabled schedulers) and is safe to call anytime — syncWithAndroid always starts by
   * wiping this scheduler's old ids before recreating them.
   */
  async resyncAll(): Promise<void> {
    console.log('[Scheduler] Resincronizando todos os alarmes nativos com o backend...');
    const schedulers = await schedulerService.getAll();
    const enabled = schedulers.filter((s) => s.enabled);
    console.log(`[Scheduler] ${enabled.length}/${schedulers.length} alarme(s) habilitado(s) para resincronizar`);
    await Promise.all(enabled.map(syncWithAndroid));
    console.log('[Scheduler] Resincronização concluída');
  },

  /**
   * Wipes every alarm this app has scheduled at the OS level. Notification channels/trigger
   * schedules live outside the backend's per-user auth — logging out does NOT make them
   * disappear on their own, so without this, alarms created by the previous account would
   * keep firing for whoever uses the device next.
   */
  async cancelAllNativeAlarms(): Promise<void> {
    console.log('[Scheduler] Cancelando todos os alarmes nativos (logout)');
    await notifee.cancelAllNotifications();
  },
};
