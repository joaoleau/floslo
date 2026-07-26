import { Pressable, View } from 'react-native';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Text } from '@/components/ui/text';
import { Ionicons } from '@expo/vector-icons';

import { Scheduler } from '@/types/domain/Scheduler';
import { WeekDays } from '@/components/scheduler/WeekDays';

import '@/styles/global.css';

interface SchedulerCardProps {
  scheduler: Scheduler;
  onPress?: () => void;
  onToggle?: (enabled: boolean) => void;
  onToggleDay?: (day: string) => void;
}

export function SchedulerCard({ scheduler, onPress, onToggle, onToggleDay }: SchedulerCardProps) {
  return (
    <Pressable onPress={onPress}>
      <Card
        className={[
          'w-full rounded-[32px] bg-background px-1 py-2',
          !scheduler.enabled && 'opacity-50',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <CardHeader className="flex-row items-center justify-between px-4">
          <Text className="flex-1 text-sm font-normal text-brand-100">{scheduler.name}</Text>
          <View className="flex-row gap-1">
            {scheduler.challengeType === 'QUIZ' && (
              <>
                <Badge className="rounded-full bg-background border border-brand-100">
                  <Ionicons name="document" size={16} color="red" />
                  <Text className="text-sm text-brand-100">
                    {scheduler.challenge.questionCount}
                  </Text>
                </Badge>
                {scheduler.challenge.difficulties.length > 0 && (
                  <Badge className="rounded-full bg-background border border-brand-100">
                    <Ionicons name="flame" size={16} color="rgb(219, 86, 33)" />
                    <Text className="text-sm text-brand-100">
                      {scheduler.challenge.difficulties[0].charAt(0)}
                    </Text>
                  </Badge>
                )}
              </>
            )}
          </View>
        </CardHeader>

        <CardContent className="px-4">
          <View className="flex-row justify-between">
            <View>
              <Text className="text-5xl font-normal text-brand-100">{scheduler.startTime}</Text>

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
