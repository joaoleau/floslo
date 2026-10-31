import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { sessionScoreLabel } from '@/lib/sessionScore';

const STREAK_STEP_DELAY_MS = 700;

export interface AlarmCompletionProps {
  streak: number | undefined;
  previousStreak: number | undefined;
  answeredCount: number;
  gradedCount: number;
  correctCount: number;
  onFinish: () => void;
}

export type CompletionMessage = 'perfect' | 'streakUp' | 'done';

export function completionMessage({
  streak,
  previousStreak,
  gradedCount,
  correctCount,
}: Pick<AlarmCompletionProps, 'streak' | 'previousStreak' | 'gradedCount' | 'correctCount'>): CompletionMessage {
  if (gradedCount > 0 && correctCount === gradedCount) return 'perfect';
  if (streak !== undefined && previousStreak !== undefined && streak > previousStreak) return 'streakUp';
  return 'done';
}

export function AlarmCompletion(props: AlarmCompletionProps) {
  const { streak, previousStreak, onFinish } = props;
  const { t } = useTranslation();
  const streakUp = streak !== undefined && previousStreak !== undefined && streak > previousStreak;
  const [shownStreak, setShownStreak] = useState(streakUp ? previousStreak : streak);

  useEffect(() => {
    if (!streakUp) return;
    const timer = setTimeout(() => setShownStreak(streak), STREAK_STEP_DELAY_MS);
    return () => clearTimeout(timer);
  }, [streakUp, streak]);

  const message = completionMessage(props);

  return (
    <View testID="alarm-completion" className="flex-1 items-center justify-center gap-6 px-8">
      <Animated.View entering={ZoomIn.duration(400)} className="items-center gap-2">
        <View className="h-28 w-28 items-center justify-center rounded-full bg-white/15">
          <Ionicons name="flame" size={64} color="#FFB020" />
        </View>
        {shownStreak !== undefined && (
          <Animated.View key={shownStreak} entering={ZoomIn.duration(300)}>
            <Text testID="alarm-completion-streak" className="text-center text-2xl font-extrabold text-white">
              {t('completion.streak', { count: shownStreak })}
            </Text>
          </Animated.View>
        )}
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(250).duration(400)} className="items-center gap-2">
        <Text className="text-center text-3xl font-bold text-white">{t(`completion.title.${message}`)}</Text>
        <Text className="text-center text-white/80">{t(`completion.message.${message}`)}</Text>
        <View className="mt-2 rounded-full bg-white/15 px-4 py-1.5">
          <Text testID="alarm-completion-score" className="text-sm font-semibold text-white">
            {sessionScoreLabel(props)}
          </Text>
        </View>
      </Animated.View>

      <Button testID="alarm-completion-finish" onPress={onFinish} className="mt-4 h-12 w-full rounded-3xl bg-white">
        <Text className="font-bold text-brand-100">{t('completion.finish')}</Text>
      </Button>
    </View>
  );
}
