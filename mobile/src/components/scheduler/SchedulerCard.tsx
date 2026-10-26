import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '@/components/ui/text';
import { Switch } from '@/components/ui/switch';
import { WeekDays } from '@/components/scheduler/WeekDays';
import { CHALLENGE_TYPE_META } from '@/constants/challengeType';
import { Challenger, LANGUAGE_FLAGS, Scheduler } from '@/types/domain/Scheduler';
import { getCardColor } from '@/lib/hashColor';

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
  // Desligado, o card fica sem cor (cinza neutro), como o documento que ainda não gera desafios.
  const backgroundColor = getCardColor(scheduler.id, scheduler.enabled);

  return (
    <Pressable
      testID="scheduler-card"
      onPress={onPress}
      onLongPress={onLongPress}
    >
      <View
        testID="scheduler-card-surface"
        className="rounded-[28px] p-3.5 gap-1.5"
        style={{
          backgroundColor,
          opacity: selectionMode && !selected ? 0.5 : 1,
          borderWidth: selected ? 3 : 0,
          borderColor: '#FFFFFF',
          borderBottomWidth: 3,
          borderBottomColor: selected ? '#FFFFFF' : 'rgba(0,0,0,0.18)',
        }}
      >
        <View className="flex-row items-start justify-between gap-2">
          {selectionMode && (
            <View
              testID="scheduler-card-checkbox"
              className="items-center justify-center rounded-full"
              style={{
                width: 20,
                height: 20,
                backgroundColor: selected ? '#FFFFFF' : 'transparent',
                borderWidth: selected ? 0 : 2,
                borderColor: '#FFFFFF',
              }}
            >
              {selected && <Ionicons name="checkmark" size={13} color={backgroundColor} />}
            </View>
          )}

          <Text className="flex-1 text-sm font-semibold text-white">{scheduler.name}</Text>

          <View className="flex-row items-center gap-1.5">
            <View testID="scheduler-card-language" className="items-center justify-center rounded-full bg-white/20 px-2 py-0.5">
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
              <View className="flex-row items-center gap-1 rounded-full bg-white/20 px-2 py-1">
                <Ionicons name="document-text" size={13} color="#FFFFFF" />
                <Text className="text-xs font-medium text-white">{scheduler.objectIds.length}</Text>
              </View>
            )}
            {!selectionMode && <Switch checked={scheduler.enabled} onCheckedChange={onToggle || (() => {})} />}
          </View>
        </View>

        <View className="flex-row items-center justify-between gap-2">
          <Text className="text-3xl font-extrabold text-white">{scheduler.startTime}</Text>

          <WeekDays
            weekDays={scheduler.weekDays}
            onToggleDay={onToggleDay}
            variant="onColor"
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
                  className="flex-row items-center justify-between gap-2 rounded-xl bg-white/15 px-2.5 py-1.5"
                >
                  <View className="flex-row items-center gap-1.5">
                    <Ionicons name={meta.icon} size={14} color="#FFFFFF" />
                    <Text className="text-xs font-medium text-white">{meta.label}</Text>
                  </View>

                  <Text className="text-xs text-white/80">{challengeConfigLabel(item)}</Text>
                </View>
              );
            })}
          </View>
        )}
      </View>
    </Pressable>
  );
}
