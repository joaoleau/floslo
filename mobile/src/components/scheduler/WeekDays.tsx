import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';

interface WeekDaysProps {
  weekDays: string[];
  onToggleDay?: (day: string) => void;

  className?: string;
  dayClassName?: string;
  textClassName?: string;
}

const DAYS = [
  { value: 'sunday', label: 'D' },
  { value: 'monday', label: 'S' },
  { value: 'tuesday', label: 'T' },
  { value: 'wednesday', label: 'Q' },
  { value: 'thursday', label: 'Q' },
  { value: 'friday', label: 'S' },
  { value: 'saturday', label: 'S' },
];

export function WeekDays({
  weekDays,
  onToggleDay,
  className,
  dayClassName,
  textClassName,
}: WeekDaysProps) {
  return (
    <View className={['flex-row gap-1', className].filter(Boolean).join(' ')}>
      {DAYS.map((day) => {
        const selected = weekDays.includes(day.value);

        return (
          <Pressable
            key={day.value}
            disabled={!onToggleDay}
            onPress={() => onToggleDay?.(day.value)}
            className={[
              'items-center justify-center rounded-full border border-brand-100',
              dayClassName,
              selected && 'bg-brand-100',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <Text
              className={[
                'text-xs font-normal',
                selected ? 'text-white' : 'text-brand-100',
                textClassName,
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {day.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
