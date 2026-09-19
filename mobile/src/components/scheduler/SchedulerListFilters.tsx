import { Pressable, ScrollView, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Scheduler } from '@/types/domain/Scheduler';

export type SchedulerFilter = 'all' | 'today' | 'tomorrow' | 'disabled';

const FILTER_OPTIONS: { value: SchedulerFilter; label: string; badgeColor: string }[] = [
  { value: 'all', label: 'Todos', badgeColor: '#3B82F6' },
  { value: 'today', label: 'Hoje', badgeColor: '#10B981' },
  { value: 'tomorrow', label: 'Amanhã', badgeColor: '#F59E0B' },
  { value: 'disabled', label: 'Desativados', badgeColor: '#9CA3AF' },
];

const WEEKDAY_BY_INDEX = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

// weekDays vazio = alarme "todo dia" (ver calculateNextOneOffTrigger em
// schedulerService.ts), então conta como "toca hoje" e "toca amanhã" também.
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

// Mesmo padrão preto/branco usado em switch/weekdays: filtro selecionado vira pílula
// preta com texto branco, os demais ficam em outline neutro. A contagem ao lado de cada
// filtro é recalculada a cada render a partir da lista completa (matchesSchedulerFilter é
// pura, então reaproveitá-la aqui não duplica a regra de cada filtro).
export function SchedulerListFilters({ value, onChange, schedulers }: SchedulerListFiltersProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      {FILTER_OPTIONS.map((option) => {
        const selected = value === option.value;
        const count = schedulers.filter((scheduler) => matchesSchedulerFilter(scheduler, option.value)).length;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            className={`flex-row items-center gap-1.5 rounded-full border px-3.5 py-2 ${
              selected ? 'border-brand-100 bg-brand-100' : 'border-border bg-card'
            }`}
          >
            <Text className={selected ? 'text-sm font-medium text-white' : 'text-sm font-medium text-foreground'}>
              {option.label}
            </Text>
            <View
              className="items-center justify-center rounded-full px-1.5"
              style={{ minWidth: 20, height: 20, backgroundColor: option.badgeColor }}
            >
              <Text className="text-[11px] font-bold text-white">{count}</Text>
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
