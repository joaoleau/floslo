import notifee, { 
  TriggerType, 
  AndroidImportance, 
  AndroidCategory, 
  TimestampTrigger 
} from '@notifee/react-native';

import { schedulersMock } from '@/api/mock/scheduler';
import { Scheduler } from '@/types/domain/Scheduler';
import { SchedulerDTO } from '@/types/api/SchedulerDTO';
import { schedulerMapper } from '@/mappers/schedulerMapper';

// ============================================================================
// NATIVE HELPER FUNCTIONS
// ============================================================================

/** Calculates the next exact timestamp considering selected week days */
function calculateNextTrigger(startTime: string, weekDays: string[]): number {
  console.log(`[Debug] calculateNextTrigger called with startTime: "${startTime}", weekDays:`, weekDays);
  
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
    console.log('[Debug] No weekdays provided. Treating as a one-time alarm.');
    let triggerDate = new Date();
    triggerDate.setHours(targetHours, targetMinutes, 0, 0);
    if (triggerDate.getTime() <= now.getTime()) {
      triggerDate.setDate(triggerDate.getDate() + 1);
    }
    console.log('[Debug] One-time alarm calculated timestamp:', triggerDate.getTime(), new Date(triggerDate.getTime()));
    return triggerDate.getTime();
  }

  for (let i = 0; i < 7; i++) {
    const candidateDate = new Date();
    candidateDate.setDate(now.getDate() + i);
    candidateDate.setHours(targetHours, targetMinutes, 0, 0);

    const candidateDayString = jsDayToStringMap[candidateDate.getDay()];

    if (weekDays.includes(candidateDayString) && candidateDate.getTime() > now.getTime()) {
      console.log(`[Debug] Found valid recurring day: ${candidateDayString} at timestamp:`, candidateDate.getTime(), new Date(candidateDate.getTime()));
      return candidateDate.getTime();
    }
  }

  const fallbackTime = now.getTime() + 24 * 60 * 60 * 1000;
  console.log('[Debug] Fallback triggered. Returning timestamp:', fallbackTime);
  return fallbackTime;
}

/** Communicates with Android to schedule or cancel the notification */
async function syncWithAndroid(scheduler: Scheduler) {
  console.log('[Debug] syncWithAndroid started for scheduler:', scheduler);

  if (!scheduler.enabled) {
    console.log(`[Debug] Scheduler ${scheduler.id} is disabled. Canceling notification.`);
    await notifee.cancelNotification(scheduler.id);
    return;
  }

  console.log('[Debug] Requesting Notifee permissions...');
  await notifee.requestPermission();

  // Tratamento do nome do som (precisa ser minúsculo, sem espaços e igual ao arquivo na pasta raw)
  // Ex: "Classic" vira "classic". Se não tiver som, usa 'default'
  const soundName = scheduler.alarmSound?.name 
    ? scheduler.alarmSound.name.toLowerCase().replace(/\s+/g, '_') 
    : 'default';

  // O PULO DO GATO: Colocar o nome do som no ID do canal!
  // Isso obriga o Android a criar um canal novo e limpo se o som mudar.
  const channelId = `alarm_${scheduler.id}_${soundName}`;
  
  console.log(`[Debug] Creating notification channel with ID: ${channelId}, sound: ${soundName}`);
  
  await notifee.createChannel({
    id: channelId,
    name: `Canal: ${scheduler.name}`,
    importance: AndroidImportance.HIGH,
    sound: soundName, // Usa a variável tratada
    vibration: scheduler.vibration,
  });

  const nextTriggerTimestamp = calculateNextTrigger(scheduler.startTime, scheduler.weekDays);

  const trigger: TimestampTrigger = {
    type: TriggerType.TIMESTAMP,
    timestamp: nextTriggerTimestamp,
    alarmManager: true, 
  };

  const hasChallenges = scheduler.challengers && scheduler.challengers.length > 0;

  console.log('[Debug] Creating trigger notification with payload and trigger:', { schedulerId: scheduler.id, trigger });

  await notifee.createTriggerNotification(
    {
      id: scheduler.id,
      title: '⏰ ' + (scheduler.name || 'Alarme'),
      body: 'Hora de acordar!',
      data: {
        schedulerId: scheduler.id,
        hasChallenges: String(hasChallenges),
      },
      android: {
        channelId, // Usa o canal novo com o áudio correto
        category: AndroidCategory.ALARM,
        autoCancel: false,
        ongoing: true,
        loopSound: true, // O Loop aqui
        fullScreenAction: { id: 'default' },
        pressAction: { id: 'default' },
      },
    },
    trigger
  );
  
  console.log(`[Native] Alarm ${scheduler.id} successfully scheduled.`);
}

// ============================================================================
// MAIN SCHEDULER SERVICE
// ============================================================================

export const schedulerService = {
  async getAll(): Promise<Scheduler[]> {
    console.log('[Debug] schedulerService.getAll called');
    return new Promise((resolve) => {
      setTimeout(() => {
        const apiResponse = schedulersMock as unknown as SchedulerDTO[];
        const mappedData = apiResponse.map(schedulerMapper.toDomain);
        console.log('[Debug] schedulerService.getAll resolved items:', mappedData.length);
        resolve(mappedData);
      }, 600);
    });
  },

  async getById(id: string): Promise<Scheduler | undefined> {
    console.log(`[Debug] schedulerService.getById called with id: ${id}`);
    return new Promise((resolve) => {
      setTimeout(() => {
        const raw = schedulersMock.find((s) => s.scheduler_id === id) as unknown as SchedulerDTO;
        const result = raw ? schedulerMapper.toDomain(raw) : undefined;
        console.log(`[Debug] schedulerService.getById result for ${id}:`, result);
        resolve(result);
      }, 500);
    });
  },

  async toggleStatus(id: string, enabled: boolean): Promise<void> {
    console.log(`[Debug] schedulerService.toggleStatus called for id: ${id}, enabled: ${enabled}`);
    await new Promise((resolve) => setTimeout(resolve, 300));

    if (!enabled) {
      console.log(`[Debug] Canceling notification for disabled alarm ${id}`);
      await notifee.cancelNotification(id);
    } else {
      const scheduler = await schedulerService.getById(id);
      if (scheduler) {
        console.log(`[Debug] Rescheduling alarm ${id} via syncWithAndroid`);
        await syncWithAndroid({ ...scheduler, enabled: true });
      } else {
        console.warn(`[Debug] Scheduler with id ${id} not found for toggleStatus.`);
      }
    }
  },

  async create(scheduler: Scheduler): Promise<void> {
    console.log('[Debug] schedulerService.create called with payload:', scheduler);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      await syncWithAndroid(scheduler);
      console.log('[Debug] schedulerService.create completed successfully.');
    } catch (error) {
      console.error('[SchedulerService] Detailed error in create():', error);
      throw error;
    }
  },

  async update(id: string, scheduler: Scheduler): Promise<void> {
    console.log(`[Debug] schedulerService.update called for id: ${id} with payload:`, scheduler);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      await syncWithAndroid(scheduler);
      console.log('[Debug] schedulerService.update completed successfully.');
    } catch (error) {
      console.error('[SchedulerService] Detailed error in update():', error);
      throw error;
    }
  },

  async deleteScheduler(id: string): Promise<void> {
    console.log(`[Debug] schedulerService.deleteScheduler called for id: ${id}`);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      await notifee.cancelNotification(id);
      console.log(`[Debug] Alarm ${id} deleted successfully.`);
    } catch (error) {
      console.error('[SchedulerService] Detailed error in deleteScheduler():', error);
      throw error;
    }
  },
};