import notifee, {
  AlarmType,
  AndroidCategory,
  AndroidImportance,
  RepeatFrequency,
  TimestampTrigger,
  TriggerType,
} from '@notifee/react-native';

import { schedulerApi } from '@/api/scheduler';
import { i18n } from '@/i18n';
import { schedulerMapper } from '@/mappers/schedulerMapper';
import { Scheduler } from '@/types/domain/Scheduler';
import { AlarmSettings, alarmSettingsStorage } from '@/storage/alarmSettingsStorage';

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

export function calculateNextTriggerForDay(startTime: string, day: string): number {
  const [targetHours, targetMinutes] = startTime.split(':').map(Number);
  const now = new Date();

  for (let i = 0; i <= 7; i++) {
    const candidateDate = new Date();
    candidateDate.setDate(now.getDate() + i);
    candidateDate.setHours(targetHours, targetMinutes, 0, 0);

    if (JS_DAY_TO_STRING[candidateDate.getDay()] === day && candidateDate.getTime() > now.getTime()) {
      return candidateDate.getTime();
    }
  }

  return now.getTime() + 7 * 24 * 60 * 60 * 1000;
}

function dayNotificationId(schedulerId: string, day: string): string {
  return `${schedulerId}__${day}`;
}

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

function alarmSettingsOf(scheduler: Scheduler): AlarmSettings {
  return {
    schedulerId: scheduler.id,
    name: scheduler.name,
    alarmSound: scheduler.alarmSound,
    vibration: scheduler.vibration,
    soundEnabled: scheduler.soundEnabled,
  };
}

async function prepareAlarmNotification(settings: AlarmSettings) {
  const soundName = settings.alarmSound ? settings.alarmSound.toLowerCase().replace(/\s+/g, '_') : 'default';

  const channelId = `alarm_${settings.schedulerId}_${soundName}_${settings.vibration ? 'vib' : 'novib'}`;

  await notifee.createChannel({
    id: channelId,
    name: i18n.t('notification.channel', { name: settings.name }),
    importance: AndroidImportance.HIGH,
    sound: soundName,
    vibration: settings.vibration,
  });

  return {
    title: '⏰ ' + (settings.name || i18n.t('notification.defaultTitle')),
    body: i18n.t('notification.body'),
    android: {
      channelId,
      category: AndroidCategory.ALARM,
      autoCancel: true,
      ongoing: false,
      loopSound: true,
      fullScreenAction: { id: 'default', launchActivity: 'default' },
      pressAction: { id: 'default', launchActivity: 'default' },
    },
  };
}

async function syncWithAndroid(scheduler: Scheduler) {
  console.log(`[Scheduler][native] Sincronizando "${scheduler.name}" (${scheduler.id})`, {
    enabled: scheduler.enabled,
    weekDays: scheduler.weekDays,
    startTime: scheduler.startTime,
  });

  await cancelAllForScheduler(scheduler.id);

  if (!scheduler.enabled) {
    console.log(`[Scheduler][native] "${scheduler.name}" está desabilitado, nenhum trigger criado`);
    return;
  }

  const permission = await notifee.requestPermission();
  console.log('[Scheduler][native] Permissão de notificação', permission);

  const settings = alarmSettingsOf(scheduler);
  await alarmSettingsStorage.save(settings).catch((err) => {
    console.warn(`[Scheduler][native] Falha ao guardar os ajustes do alarme "${scheduler.name}"`, err);
  });
  const baseNotification = await prepareAlarmNotification(settings);

  try {
    if (!scheduler.weekDays || scheduler.weekDays.length === 0) {
      const timestamp = calculateNextOneOffTrigger(scheduler.startTime);
      const trigger: TimestampTrigger = {
        type: TriggerType.TIMESTAMP,
        timestamp,
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

    await Promise.all(
      scheduler.weekDays.map((day) => {
        const timestamp = calculateNextTriggerForDay(scheduler.startTime, day);
        const trigger: TimestampTrigger = {
          type: TriggerType.TIMESTAMP,
          timestamp,
          repeatFrequency: RepeatFrequency.WEEKLY,
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
    await alarmSettingsStorage.remove(id).catch(() => undefined);
  },

  async showRingingAlarm(settings: AlarmSettings, notificationId: string): Promise<void> {
    const notification = await prepareAlarmNotification(settings);
    await notifee.displayNotification({ ...notification, id: notificationId, data: { schedulerId: settings.schedulerId } });
  },

  async resyncAll(): Promise<void> {
    console.log('[Scheduler] Resincronizando todos os alarmes nativos com o backend...');
    const schedulers = await schedulerService.getAll();
    const enabled = schedulers.filter((s) => s.enabled);
    console.log(`[Scheduler] ${enabled.length}/${schedulers.length} alarme(s) habilitado(s) para resincronizar`);
    await Promise.all(enabled.map(syncWithAndroid));
    console.log('[Scheduler] Resincronização concluída');
  },

  async cancelAllNativeAlarms(): Promise<void> {
    console.log('[Scheduler] Cancelando todos os alarmes nativos (logout)');
    await notifee.cancelAllNotifications();
  },
};
