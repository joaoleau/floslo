import notifee, {
  AndroidCategory,
  AndroidImportance,
  TimestampTrigger,
  TriggerType,
} from '@notifee/react-native';

import { schedulerApi } from '@/api/scheduler';
import { schedulerMapper } from '@/mappers/schedulerMapper';
import { Scheduler } from '@/types/domain/Scheduler';

// ============================================================================
// NATIVE HELPER FUNCTIONS
// ============================================================================

/** Calculates the next exact timestamp considering selected week days */
function calculateNextTrigger(startTime: string, weekDays: string[]): number {
  const [targetHours, targetMinutes] = startTime.split(':').map(Number);
  const now = new Date();

  const jsDayToStringMap: Record<number, string> = {
    0: 'sunday',
    1: 'monday',
    2: 'tuesday',
    3: 'wednesday',
    4: 'thursday',
    5: 'friday',
    6: 'saturday',
  };

  if (!weekDays || weekDays.length === 0) {
    const triggerDate = new Date();
    triggerDate.setHours(targetHours, targetMinutes, 0, 0);
    if (triggerDate.getTime() <= now.getTime()) {
      triggerDate.setDate(triggerDate.getDate() + 1);
    }
    return triggerDate.getTime();
  }

  for (let i = 0; i < 7; i++) {
    const candidateDate = new Date();
    candidateDate.setDate(now.getDate() + i);
    candidateDate.setHours(targetHours, targetMinutes, 0, 0);

    const candidateDayString = jsDayToStringMap[candidateDate.getDay()];

    if (weekDays.includes(candidateDayString) && candidateDate.getTime() > now.getTime()) {
      return candidateDate.getTime();
    }
  }

  return now.getTime() + 24 * 60 * 60 * 1000;
}

/** Communicates with Android to schedule or cancel the notification */
async function syncWithAndroid(scheduler: Scheduler) {
  if (!scheduler.enabled) {
    await notifee.cancelNotification(scheduler.id);
    return;
  }

  await notifee.requestPermission();

  // Sound name must be lowercase, no spaces, matching the raw resource filename.
  const soundName = scheduler.alarmSound ? scheduler.alarmSound.toLowerCase().replace(/\s+/g, '_') : 'default';

  // Baking the sound into the channel id forces Android to create a fresh
  // channel whenever the sound changes (channel settings are otherwise immutable).
  const channelId = `alarm_${scheduler.id}_${soundName}`;

  await notifee.createChannel({
    id: channelId,
    name: `Canal: ${scheduler.name}`,
    importance: AndroidImportance.HIGH,
    sound: soundName,
    vibration: scheduler.vibration,
  });

  const nextTriggerTimestamp = calculateNextTrigger(scheduler.startTime, scheduler.weekDays);

  const trigger: TimestampTrigger = {
    type: TriggerType.TIMESTAMP,
    timestamp: nextTriggerTimestamp,
    alarmManager: true,
  };

  await notifee.createTriggerNotification(
    {
      id: scheduler.id,
      title: '⏰ ' + (scheduler.name || 'Alarme'),
      body: 'Hora de acordar!',
      data: {
        schedulerId: scheduler.id,
      },
      android: {
        channelId,
        category: AndroidCategory.ALARM,
        autoCancel: false,
        ongoing: true,
        loopSound: true,
        fullScreenAction: { id: 'default' },
        pressAction: { id: 'default' },
      },
    },
    trigger
  );
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
    } catch {
      return undefined;
    }
  },

  async toggleStatus(id: string, enabled: boolean): Promise<Scheduler> {
    const updated = await schedulerApi.update(id, { enabled });
    const scheduler = schedulerMapper.toDomain(updated);
    await syncWithAndroid(scheduler);
    return scheduler;
  },

  async create(scheduler: Scheduler): Promise<Scheduler> {
    const created = await schedulerApi.create(schedulerMapper.toDTO(scheduler));
    const mapped = schedulerMapper.toDomain(created);
    await syncWithAndroid(mapped);
    return mapped;
  },

  async update(id: string, scheduler: Scheduler): Promise<Scheduler> {
    const updated = await schedulerApi.update(id, schedulerMapper.toUpdateDTO(scheduler));
    const merged = schedulerMapper.toDomain(updated);
    await syncWithAndroid(merged);
    return merged;
  },

  async deleteScheduler(id: string): Promise<void> {
    await schedulerApi.remove(id);
    await notifee.cancelNotification(id);
  },
};
