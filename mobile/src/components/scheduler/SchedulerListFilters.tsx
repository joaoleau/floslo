import { Pressable, ScrollView, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { useTranslation } from 'react-i18next';
import { Scheduler } from '@/types/domain/Scheduler';

export type SchedulerFilter = 'all' | 'today' | 'tomorrow' | 'disabled';

const FILTER_OPTIONS: SchedulerFilter[] = ['all', 'today', 'tomorrow', 'disabled'];

const WEEKDAY_BY_INDEX = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function firesOn(scheduler: Scheduler, weekdayIndex: number): boolean {
  return scheduler.weekDays.length === 0 || scheduler.weekDays.includes(WEEKDAY_BY_INDEX[weekdayIndex]);
}

export function matchesSchedulerFilter(scheduler: Scheduler, filter: SchedulerFilter): boolean {
  const now = new Date();
  switch (filter) {
    case 'all':
      return true;
    case 'disabled':
      return !scheduler.enabled;
    case 'today':
      return scheduler.enabled && firesOn(scheduler, now.getDay());
    case 'tomorrow':
      return scheduler.enabled && firesOn(scheduler, (now.getDay() + 1) % 7);
  }
}

interface SchedulerListFiltersProps {
  value: SchedulerFilter;
  onChange: (value: SchedulerFilter) => void;
  schedulers: Scheduler[];
}

export function SchedulerListFilters({ value, onChange, schedulers }: SchedulerListFiltersProps) {
  const { t } = useTranslation();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      {FILTER_OPTIONS.map((option) => {
        const selected = value === option;
        const count = schedulers.filter((scheduler) => matchesSchedulerFilter(scheduler, option)).length;
        return (
          <Pressable
            key={option}
            onPress={() => onChange(option)}
            className={`flex-row items-center gap-1.5 rounded-full border px-3.5 py-2 ${
              selected ? 'border-brand-100 bg-brand-100' : 'border-border bg-card'
            }`}
          >
            <Text className={selected ? 'text-sm font-medium text-white' : 'text-sm font-medium text-foreground'}>
              {t(`schedulers.filters.${option}`)}
            </Text>
            <View
              testID={`scheduler-filter-count-${option}`}
              className={`items-center justify-center rounded-full px-1.5 ${selected ? 'bg-white/20' : 'bg-muted'}`}
              style={{ minWidth: 20, height: 20 }}
            >
              <Text className={`text-[11px] font-bold ${selected ? 'text-white' : 'text-foreground'}`}>{count}</Text>
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
