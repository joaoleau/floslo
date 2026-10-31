import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from '@/components/common/Screen';
import { Header } from '@/components/common/Header';
import { ErrorState } from '@/components/common/ErrorState';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { CHALLENGE_TYPE_META } from '@/constants/challengeType';

import { useTagDetailQuery } from '@/hooks/useHistory';
import { useThemeColors } from '@/hooks/useThemeColors';

export default function TagDetailScreen() {
  const colors = useThemeColors();
  const { t } = useTranslation();
  const router = useRouter();
  const { tag } = useLocalSearchParams<{ tag: string }>();
  const { data: detail, isPending, isError, refetch } = useTagDetailQuery(tag);

  const accuracyLabel =
    detail?.stat.accuracy !== null && detail?.stat.accuracy !== undefined
      ? `${Math.round(detail.stat.accuracy * 100)}%`
      : '—';

  return (
    <Screen edges={['top', 'left', 'right']}>
      <Header title={tag} />

      {isPending ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      ) : isError || !detail ? (
        <ErrorState message={t('history.tag.loadFailed')} onRetry={() => refetch()} />
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-4 p-4 pb-28"
          showsVerticalScrollIndicator={false}
        >
          <Card className="rounded-3xl p-5 gap-4">
            <View className="flex-row justify-between pt-1">
              <View className="items-center gap-1">
                <Text className="text-xl font-bold text-foreground">{detail.stat.total}</Text>
                <Text className="text-xs text-muted-foreground">{t('history.tag.answered')}</Text>
              </View>
              <View className="items-center gap-1">
                <Text className="text-xl font-bold text-foreground">{accuracyLabel}</Text>
                <Text className="text-xs text-muted-foreground">{t('history.tag.firstTryAccuracy')}</Text>
              </View>
            </View>
            {!detail.stat.hasEnoughData && (
              <Text className="text-xs text-center text-muted-foreground">
                {t('history.tag.notEnoughData')}
              </Text>
            )}
          </Card>

          <Card className="rounded-3xl p-5 gap-4">
            <Text className="text-lg font-semibold text-foreground">{t('history.tag.recentAnswers')}</Text>
            <View className="gap-3">
              {detail.recentAttempts.map((attempt) => {
                const meta = CHALLENGE_TYPE_META[attempt.challengeType];
                return (
                  <Pressable
                    key={attempt.id}
                    onPress={() => router.push({ pathname: '/(history)/attempt/[id]', params: { id: attempt.id } })}
                    className="rounded-xl border border-border p-3 gap-1.5"
                  >
                    <View className="flex-row items-center justify-between gap-2">
                      <View className="flex-row items-center gap-1.5">
                        <Ionicons name={meta.icon} size={14} color={meta.color} />
                        <Text className="text-xs text-muted-foreground">{meta.label}</Text>
                      </View>
                      {attempt.isCorrect !== null && (
                        <Ionicons
                          name={attempt.isCorrect ? 'checkmark-circle' : 'close-circle'}
                          size={16}
                          color={attempt.isCorrect ? colors.success : colors.destructive}
                        />
                      )}
                    </View>
                    <Text className="text-sm font-medium text-foreground" numberOfLines={2}>
                      {attempt.promptText}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Card>
        </ScrollView>
      )}
    </Screen>
  );
}
