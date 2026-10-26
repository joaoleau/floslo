import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '@/components/ui/text';
import { useTranslation } from 'react-i18next';
import { useThemeColors } from '@/hooks/useThemeColors';

interface StudyWeekStripProps {
  /** Uma linha por dia com pelo menos 1 resposta (ver historyService.getDailyActivity). */
  activity: { date: string; count: number }[];
  /** Quantas semanas pra trás dá pra navegar -- deve bater com os `days` pedidos na
   * query e com HISTORY_RETENTION_DAYS (histórico local só guarda os últimos 30 dias,
   * então um calendário de meses inteiros só mostraria buracos vazios sem sentido). */
  weeksBack?: number;
}

// Iniciais dos dias (domingo a sábado) e nomes curtos dos meses vêm do dicionário, em
// history.week.

const LEVEL_THRESHOLDS = [1, 3, 6, 10];
// Verde, no espírito do gráfico de contribuições do GitHub -- as 4 tonalidades clássicas.
const LEVEL_COLORS = ['#9BE9A8', '#40C463', '#30A14E', '#216E39'];
// Os dois primeiros níveis são claros demais pra texto branco -- índices 0 e 1 usam
// texto escuro, só os dois mais saturados (2 e 3) usam branco.
const LEVEL_TEXT_IS_LIGHT = [false, false, true, true];

function levelIndex(count: number): number {
  let level = -1;
  for (const threshold of LEVEL_THRESHOLDS) {
    if (count >= threshold) level++;
  }
  return level;
}

function dateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function startOfWeek(date: Date): Date {
  const start = new Date(date);
  start.setDate(start.getDate() - start.getDay());
  start.setHours(0, 0, 0, 0);
  return start;
}

// Uma semana por vez (domingo-sábado), navegável -- não um calendário do ano inteiro,
// que só faria sentido se o histórico local não fosse podado depois de 30 dias.
export function StudyWeekStrip({ activity, weeksBack = 4 }: StudyWeekStripProps) {
  const colors = useThemeColors();
  const { t } = useTranslation();
  const weekdayLabels = t('history.week.weekdays').split(',');
  const monthLabels = t('history.week.months').split(',');
  const countByDate = useMemo(() => new Map(activity.map((entry) => [entry.date, entry.count])), [activity]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const currentWeekStart = startOfWeek(today);

  // 0 = semana atual, negativo = semanas anteriores.
  const [weekOffset, setWeekOffset] = useState(0);
  const canGoNext = weekOffset < 0;
  const canGoPrev = weekOffset > -weeksBack;

  const visibleWeekStart = new Date(currentWeekStart);
  visibleWeekStart.setDate(visibleWeekStart.getDate() + weekOffset * 7);

  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(visibleWeekStart);
    date.setDate(date.getDate() + index);
    return date;
  });

  const firstDay = days[0];
  const lastDay = days[6];
  const rangeLabel =
    firstDay.getMonth() === lastDay.getMonth()
      ? t('history.week.sameMonth', { from: firstDay.getDate(), to: lastDay.getDate(), month: monthLabels[lastDay.getMonth()] })
      : t('history.week.twoMonths', {
          from: firstDay.getDate(),
          fromMonth: monthLabels[firstDay.getMonth()],
          to: lastDay.getDate(),
          toMonth: monthLabels[lastDay.getMonth()],
        });

  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between">
        <Pressable onPress={() => setWeekOffset((value) => value - 1)} disabled={!canGoPrev} hitSlop={8}>
          <Ionicons name="chevron-back" size={20} color={canGoPrev ? colors.brand : colors.brandSoft} />
        </Pressable>
        <Text className="text-sm font-semibold text-foreground">{rangeLabel}</Text>
        <Pressable onPress={() => setWeekOffset((value) => value + 1)} disabled={!canGoNext} hitSlop={8}>
          <Ionicons name="chevron-forward" size={20} color={canGoNext ? colors.brand : colors.brandSoft} />
        </Pressable>
      </View>

      <View className="flex-row justify-between">
        {days.map((date, index) => {
          const isFuture = date.getTime() > today.getTime();
          const count = isFuture ? 0 : (countByDate.get(dateKey(date)) ?? 0);
          const level = levelIndex(count);
          const fill = level >= 0 ? LEVEL_COLORS[level] : null;
          const textIsLight = level >= 0 && LEVEL_TEXT_IS_LIGHT[level];
          const isToday = date.getTime() === today.getTime();

          return (
            <View key={index} className="items-center gap-1">
              <Text className="text-xs font-medium text-muted-foreground">{weekdayLabels[date.getDay()]}</Text>
              <View
                className="items-center justify-center rounded-full"
                style={{
                  width: 36,
                  height: 36,
                  backgroundColor: fill ?? 'transparent',
                  borderWidth: isToday || (!fill && !isFuture) ? (isToday ? 2 : 1) : 0,
                  borderColor: fill ? (textIsLight ? '#FFFFFF' : LEVEL_COLORS[3]) : colors.brand,
                  opacity: isFuture ? 0.3 : 1,
                }}
              >
                <Text
                  className={`text-sm font-semibold ${textIsLight ? 'text-white' : 'text-foreground'}`}
                  style={!textIsLight && fill ? { color: LEVEL_COLORS[3] } : undefined}
                >
                  {date.getDate()}
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      <View className="flex-row items-center justify-end gap-1.5 pt-1">
        <Text className="text-xs text-muted-foreground">{t('history.week.less')}</Text>
        {LEVEL_COLORS.map((color) => (
          <View key={color} className="rounded-sm" style={{ width: 12, height: 12, backgroundColor: color }} />
        ))}
        <Text className="text-xs text-muted-foreground">{t('history.week.more')}</Text>
      </View>
    </View>
  );
}
