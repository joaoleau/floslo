import { schedulersMock } from '@/api/mock/scheduler';
import { Scheduler } from '@/types/domain/Scheduler';
import { SchedulerDTO } from '@/types/api/SchedulerDTO';
import { schedulerMapper } from '@/mappers/schedulerMapper';

export const schedulerService = {
  async getAll(): Promise<Scheduler[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const apiResponse = schedulersMock as unknown as SchedulerDTO[];

        const mappedData = apiResponse.map(schedulerMapper.toDomain);

        resolve(mappedData);
      }, 600);
    });
  },

  async toggleStatus(id: string, enabled: boolean): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log(`[Service] Status do alarme ${id} alterado para: ${enabled}`);
        resolve();
      }, 300);
    });
  },

  async getById(id: string): Promise<Scheduler | undefined> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const raw = schedulersMock.find((s) => s.scheduler_id === id) as unknown as SchedulerDTO;
        resolve(raw ? schedulerMapper.toDomain(raw) : undefined);
      }, 500);
    });
  },

  async create(scheduler: Scheduler): Promise<void> {
    return new Promise((resolve) => setTimeout(() => resolve(), 500));
  },

  async update(id: string, scheduler: Scheduler): Promise<void> {
    return new Promise((resolve) => setTimeout(() => resolve(), 500));
  },

  async deleteScheduler(id: string): Promise<void> {
    return new Promise((resolve) => setTimeout(() => resolve(), 500));
  },
};
