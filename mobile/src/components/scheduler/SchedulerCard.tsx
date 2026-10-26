import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '@/components/ui/text';
import { Switch } from '@/components/ui/switch';
import { WeekDays } from '@/components/scheduler/WeekDays';
import { CHALLENGE_TYPE_META } from '@/constants/challengeType';
import { Challenger, LANGUAGE_FLAGS, Scheduler } from '@/types/domain/Scheduler';
import { getColorForId } from '@/lib/hashColor';
import { cardSurface } from '@/lib/cardSurface';
import { useThemeColors } from '@/hooks/useThemeColors';

interface SchedulerCardProps {
  scheduler: Scheduler;
  onPress?: () => void;
  onLongPress?: () => void;
  onToggle?: (enabled: boolean) => void;
  onToggleDay?: (day: string) => void;
  selectionMode?: boolean;
  selected?: boolean;
}

function challengeConfigLabel(item: Challenger): string {
  switch (item.challengeType) {
    case 'MULTIPLE_CHOICE':
      return `${item.challenge.questionCount} questões`;
    case 'TRUE_FALSE':
      return `${item.challenge.questionCount} afirmações`;
    case 'DISCOVERY':
      return `${item.challenge.discoveryCount} descobertas`;
  }
}

// Item da listagem de agendadores (um abaixo do outro): card cheio, colorido (cor
// tirada do hash do próprio id -- ver getColorForId). A ideia continua sendo puxar
// pra estética de "app de estudo" (tipo cursos/lições), não de relógio: hora em destaque,
// weekdays ao lado da hora (aproveitando o espaço que sobrava à direita) e cada desafio
// configurado listado em uma linha (tipo e quantidade). O idioma é do agendador, então
// aparece uma vez só, no cabeçalho. Dimensões bem reduzidas (fonte do horário, ícones,
// paddings) mantendo todos os mesmos detalhes.
export function SchedulerCard({
  scheduler,
  onPress,
  onLongPress,
  onToggle,
  onToggleDay,
  selectionMode = false,
  selected = false,
}: SchedulerCardProps) {
  const colors = useThemeColors();
  // Desligado, o card fica só com o contorno, sem fundo colorido, como os filtros não
  // selecionados; o documento que ainda não gera desafios segue a mesma regra.
  const outlined = !scheduler.enabled;
  const backgroundColor = getColorForId(scheduler.id);
  const ink = outlined ? colors.primary : '#FFFFFF';
  const chip = outlined ? 'bg-muted' : 'bg-white/20';
  const text = outlined ? 'text-foreground' : 'text-white';

  return (
    <Pressable
      testID="scheduler-card"
      onPress={onPress}
      onLongPress={onLongPress}
    >
      <View
        testID="scheduler-card-surface"
        className={`rounded-[28px] p-3.5 gap-1.5 ${outlined ? 'border border-border bg-card' : ''}`}
        style={cardSurface({ color: backgroundColor, outlined, selected, dimmed: selectionMode && !selected, ink })}
      >
        <View className="flex-row items-start justify-between gap-2">
          {selectionMode && (
            <View
              testID="scheduler-card-checkbox"
              className="items-center justify-center rounded-full"
              style={{
                width: 20,
                height: 20,
                backgroundColor: selected ? ink : 'transparent',
                borderWidth: selected ? 0 : 2,
                borderColor: ink,
              }}
            >
              {selected && <Ionicons name="checkmark" size={13} color={outlined ? colors.primaryForeground : backgroundColor} />}
            </View>
          )}

          <Text className={`flex-1 text-sm font-semibold ${text}`}>{scheduler.name}</Text>

          <View className="flex-row items-center gap-1.5">
            <View testID="scheduler-card-language" className={`items-center justify-center rounded-full ${chip} px-2 py-0.5`}>
              <Text
                style={{
                  fontSize: 13,
                  lineHeight: 18,
                  textAlign: 'center',
                  includeFontPadding: false,
                }}
              >
                {LANGUAGE_FLAGS[scheduler.language]}
              </Text>
            </View>
            {scheduler.objectIds.length > 0 && (
              <View className={`flex-row items-center gap-1 rounded-full ${chip} px-2 py-1`}>
                <Ionicons name="document-text" size={13} color={ink} />
                <Text className={`text-xs font-medium ${text}`}>{scheduler.objectIds.length}</Text>
              </View>
            )}
            {!selectionMode && <Switch checked={scheduler.enabled} onCheckedChange={onToggle || (() => {})} />}
          </View>
        </View>

        <View className="flex-row items-center justify-between gap-2">
          <Text className={`text-3xl font-extrabold ${text}`}>{scheduler.startTime}</Text>

          <WeekDays
            weekDays={scheduler.weekDays}
            onToggleDay={onToggleDay}
            variant={outlined ? 'default' : 'onColor'}
            dayClassName="w-4 h-6"
          />
        </View>

        {scheduler.challengers.length > 0 && (
          <View className="gap-1">
            {scheduler.challengers.map((item, index) => {
              const meta = CHALLENGE_TYPE_META[item.challengeType];

              return (
                <View
                  key={`${item.challengeType}-${index}`}
                  className={`flex-row items-center justify-between gap-2 rounded-xl ${outlined ? 'bg-muted' : 'bg-white/15'} px-2.5 py-1.5`}
                >
                  <View className="flex-row items-center gap-1.5">
                    <Ionicons name={meta.icon} size={14} color={ink} />
                    <Text className={`text-xs font-medium ${text}`}>{meta.label}</Text>
                  </View>

                  <Text className={`text-xs ${outlined ? 'text-muted-foreground' : 'text-white/80'}`}>{challengeConfigLabel(item)}</Text>
                </View>
              );
            })}
          </View>
        )}
      </View>
    </Pressable>
  );
}
