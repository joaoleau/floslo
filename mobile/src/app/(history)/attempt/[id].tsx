import { ActivityIndicator, ScrollView, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from '@/components/common/Screen';
import { Header } from '@/components/common/Header';
import { ErrorState } from '@/components/common/ErrorState';
import { Text } from '@/components/ui/text';
import { CHALLENGE_TYPE_META } from '@/constants/challengeType';
import { ChoiceReview, DiscoveryReview } from '@/components/challenges/ChallengeReview';

import { useAttemptDetailQuery } from '@/hooks/useHistory';
import { useThemeColors } from '@/hooks/useThemeColors';
import { dateLocale } from '@/i18n';
import { documentName } from '@/lib/documentName';

export default function AttemptReviewScreen() {
  const colors = useThemeColors();
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: attempt, isPending, isError, refetch } = useAttemptDetailQuery(id);

  return (
    <Screen edges={['top', 'left', 'right']}>
      <Header title={t('history.attempt.title')} />

      {isPending ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      ) : isError || !attempt ? (
        <ErrorState message={t('history.attempt.loadFailed')} onRetry={() => refetch()} />
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-4 p-4 pb-28"
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-row items-center gap-2">
            <Ionicons
              name={CHALLENGE_TYPE_META[attempt.challengeType].icon}
              size={16}
              color={CHALLENGE_TYPE_META[attempt.challengeType].color}
            />
            <Text className="text-sm text-muted-foreground">
              {attempt.tag} • {attempt.schedulerName} • {new Date(attempt.answeredAt).toLocaleDateString(dateLocale())}
            </Text>
          </View>

          {attempt.options ? (
            <ChoiceReview
              promptText={attempt.promptText}
              explanationText={attempt.explanationText}
              options={attempt.options}
              wrongAttempts={attempt.wrongAttempts}
              colors={colors}
            />
          ) : (
            <DiscoveryReview promptText={attempt.promptText} explanationText={attempt.explanationText} />
          )}

          {attempt.sourceObjectKey && (
            <Text className="text-xs text-center text-muted-foreground">
              {t('history.attempt.basedOn', { source: documentName(attempt.sourceObjectKey) })}
              {attempt.sourcePage !== null ? ` • ${t('history.attempt.page', { page: attempt.sourcePage })}` : ''}
            </Text>
          )}
        </ScrollView>
      )}
    </Screen>
  );
}
