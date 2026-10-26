import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { useTranslation } from 'react-i18next';

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

// Domingo a sábado. As iniciais vêm do dicionário (history.week.weekdays), na mesma ordem.
const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

export function WeekDays({
  weekDays,
  onToggleDay,
  variant = 'default',
  className,
  dayClassName,
  textClassName,
}: WeekDaysProps) {
  const { t } = useTranslation();
  const labels = t('history.week.weekdays').split(',');
  return (
    <View className={['flex-row gap-1', className].filter(Boolean).join(' ')}>
      {DAYS.map((day, index) => {
        const selected = weekDays.includes(day);

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
            key={day}
            testID={`weekday-${day}`}
            disabled={!onToggleDay}
            onPress={() => onToggleDay?.(day)}
            className={['items-center justify-center rounded-full', pillClassName, dayClassName]
              .filter(Boolean)
              .join(' ')}
          >
            <Text className={['text-xs font-normal', textColorClassName, textClassName].filter(Boolean).join(' ')}>
              {labels[index]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
