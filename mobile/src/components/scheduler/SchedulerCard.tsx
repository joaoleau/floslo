import { Pressable, View } from 'react-native';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Text } from '@/components/ui/text';
import { Ionicons } from '@expo/vector-icons';

import { Scheduler } from '@/types/domain/Scheduler';
import { WeekDays } from '@/components/scheduler/WeekDays';
import { useThemeColors } from '@/hooks/useThemeColors';

import '@/styles/global.css';

const CHALLENGE_TYPE_STYLES: Record<
  Scheduler['challengers'][number]['challengeType'],
  { icon: React.ComponentProps<typeof Ionicons>['name']; color: string; bg: string }
> = {
  QUIZ: { icon: 'school-outline', color: '#2563eb', bg: 'bg-blue-500/10' },
  FLASHCARD: { icon: 'albums-outline', color: '#7c3aed', bg: 'bg-violet-500/10' },
  TRUE_FALSE: { icon: 'checkmark-done-outline', color: '#0d9488', bg: 'bg-teal-500/10' },
};

interface SchedulerCardProps {
  scheduler: Scheduler;
  onPress?: () => void;
  onToggle?: (enabled: boolean) => void;
  onToggleDay?: (day: string) => void;
}

export function SchedulerCard({ scheduler, onPress, onToggle, onToggleDay }: SchedulerCardProps) {
  const colors = useThemeColors();

  return (
    <Pressable onPress={onPress}>
      <Card
        className={[
          'w-full rounded-[32px] bg-card px-1 py-2',
          !scheduler.enabled && 'opacity-50',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <CardHeader className="flex-row items-center justify-between px-4">
          <View
            className="flex-row items-center gap-1.5"
            style={{ flexGrow: 1, flexShrink: 1, flexBasis: 0, overflow: 'hidden' }}
          >
            {scheduler.strictMode && (
              <Ionicons name="lock-closed" size={13} color={colors.primary} />
            )}
            <Text
              className="text-sm font-normal text-foreground"
              style={{ flexShrink: 1, overflow: 'hidden' }}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {scheduler.name}
            </Text>
          </View>

          <View className="flex-row gap-1" style={{ flexShrink: 0 }}>
            {/* Badge indicando a quantidade de objetos/materiais de estudo */}

            {scheduler.objectIds && scheduler.objectIds.length > 0 && (
              <Badge className="rounded-full bg-background border border-border flex-row items-center">
                <Ionicons name="document-text" size={16} color={colors.brand} />
                <Text className="text-sm text-foreground ml-1">
                  {scheduler.objectIds.length}
                </Text>
              </Badge>
            )}

            {/* Badges iterando sobre os desafios ativos -- uma cor por tipo de desafio */}
            {scheduler.challengers?.map((challenger, index) => {
              const style = CHALLENGE_TYPE_STYLES[challenger.challengeType];
              return (
                <View key={`${challenger.challengeType}-${index}`} className="flex-row gap-1">
                  <Badge className={`rounded-full border-0 flex-row items-center ${style.bg}`}>
                    <Ionicons name={style.icon} size={16} color={style.color} />
                  </Badge>
                </View>
              );
            })}
          </View>
        </CardHeader>

        <CardContent className="px-4">
          <View className="flex-row justify-between">
            <View>
              <Text className="text-5xl font-normal text-foreground">{scheduler.startTime}</Text>

              <WeekDays
                weekDays={scheduler.weekDays}
                onToggleDay={onToggleDay}
                dayClassName="w-4 h-5"
              />
            </View>

            <View className="justify-center pb-6">
              <Switch checked={scheduler.enabled} onCheckedChange={onToggle || (() => {})} />
            </View>
          </View>
        </CardContent>
      </Card>
    </Pressable>
  );
}