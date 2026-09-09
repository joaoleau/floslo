import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';

interface WeekDaysProps {
  weekDays: string[];
  onToggleDay?: (day: string) => void;

  /**
   * 'default': contorno neutro do tema (form/detalhe, fundo neutro) -- comportamento
   * original, inalterado.
   * 'onColor': pensado pra ficar em cima do fundo colorido do SchedulerCard -- selecionado
   * vira uma pílula branca sólida (com texto escuro), não selecionado fica só em
   * outline branco (sem preenchimento).
   */
  variant?: 'default' | 'onColor';

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
  variant = 'default',
  className,
  dayClassName,
  textClassName,
}: WeekDaysProps) {
  return (
    <View className={['flex-row gap-1', className].filter(Boolean).join(' ')}>
      {DAYS.map((day) => {
        const selected = weekDays.includes(day.value);

        const pillClassName =
          variant === 'onColor'
            ? selected
              ? 'bg-white'
              : 'border border-white/60'
            : ['border border-brand-100', selected && 'bg-brand-100'].filter(Boolean).join(' ');

        const textColorClassName =
          variant === 'onColor' ? (selected ? 'text-brand-100' : 'text-white') : selected ? 'text-white' : 'text-brand-100';

        return (
          <Pressable
            key={day.value}
            testID={`weekday-${day.value}`}
            disabled={!onToggleDay}
            onPress={() => onToggleDay?.(day.value)}
            className={['items-center justify-center rounded-full', pillClassName, dayClassName]
              .filter(Boolean)
              .join(' ')}
          >
            <Text className={['text-xs font-normal', textColorClassName, textClassName].filter(Boolean).join(' ')}>
              {day.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
