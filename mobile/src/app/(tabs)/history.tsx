import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from '@/components/common/Screen';
import { Header } from '@/components/common/Header';
import { ErrorState } from '@/components/common/ErrorState';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { TagAccuracyRow } from '@/components/history/TagAccuracyRow';
import { UserStatsSummaryCard } from '@/components/history/UserStatsSummaryCard';
import { CHALLENGE_TYPE_META } from '@/constants/challengeType';

import {
  useRecentMistakesQuery,
  useSessionsQuery,
  useTagBreakdownQuery,
  useUserStatsQuery,
} from '@/hooks/useHistory';
import { useThemeColors } from '@/hooks/useThemeColors';

export default function HistoryScreen() {
  const router = useRouter();
  const colors = useThemeColors();

  const statsQuery = useUserStatsQuery();
  const tagsQuery = useTagBreakdownQuery();
  const mistakesQuery = useRecentMistakesQuery(8);
  const sessionsQuery = useSessionsQuery(10);

  const isPending = statsQuery.isPending || tagsQuery.isPending;
  const isError = statsQuery.isError || tagsQuery.isError;
  const totalAnswered = statsQuery.data
    ? Object.values(statsQuery.data.answeredByType).reduce((sum, n) => sum + n, 0)
    : 0;

  function retryAll() {
    statsQuery.refetch();
    tagsQuery.refetch();
    mistakesQuery.refetch();
    sessionsQuery.refetch();
  }

  return (
    <Screen edges={['top', 'left', 'right']}>
      <Header title="Histórico" showBackButton={false} />

      {isPending ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      ) : isError ? (
        <ErrorState message="Não foi possível carregar seu histórico." onRetry={retryAll} />
      ) : totalAnswered === 0 ? (
        <View className="items-center gap-4 px-8 mt-10">
          <View className="h-24 w-24 items-center justify-center rounded-full bg-accent">
            <Ionicons name="extension-puzzle-outline" size={44} color={colors.primary} />
          </View>
          <View className="items-center gap-1">
            <Text className="text-center text-xl font-bold text-foreground">Nada por aqui ainda</Text>
            <Text className="text-center text-muted-foreground">
              Responda seus agendadores e acompanhe aqui em quais temas você vai bem e quais precisa reforçar.
            </Text>
          </View>
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-4 p-4 pb-28"
          showsVerticalScrollIndicator={false}
        >
          <UserStatsSummaryCard stats={statsQuery.data} />

          {tagsQuery.data && tagsQuery.data.length > 0 && (
            <Card className="rounded-3xl p-5 gap-3">
              <Text className="text-lg font-semibold text-foreground">Por assunto</Text>
              <View className="gap-2">
                {tagsQuery.data.map((stat) => (
                  <TagAccuracyRow
                    key={stat.tag}
                    stat={stat}
                    onPress={() => router.push({ pathname: '/(history)/tag/[tag]', params: { tag: stat.tag } })}
                  />
                ))}
              </View>
            </Card>
          )}

          {mistakesQuery.data && mistakesQuery.data.length > 0 && (
            <Card className="rounded-3xl p-5 gap-3">
              <Text className="text-lg font-semibold text-foreground">Erros recentes</Text>
              <View className="gap-3">
                {mistakesQuery.data.map((mistake) => {
                  const meta = CHALLENGE_TYPE_META[mistake.challengeType];
                  return (
                    <View
                      key={mistake.id}
                      className="rounded-xl border border-border p-3 gap-1.5"
                    >
                      <View className="flex-row items-center gap-1.5">
                        <Ionicons name={meta.icon} size={14} color={meta.color} />
                        <Text className="text-xs font-medium text-muted-foreground">{mistake.tag}</Text>
                      </View>
                      <Text className="text-sm font-medium text-foreground" numberOfLines={2}>
                        {mistake.promptText}
                      </Text>
                      {mistake.explanationText && (
                        <Text className="text-xs text-muted-foreground" numberOfLines={2}>
                          {mistake.explanationText}
                        </Text>
                      )}
                    </View>
                  );
                })}
              </View>
            </Card>
          )}

          {sessionsQuery.data && sessionsQuery.data.length > 0 && (
            <Card className="rounded-3xl p-5 gap-3">
              <Text className="text-lg font-semibold text-foreground">Sessões recentes</Text>
              <View className="gap-2">
                {sessionsQuery.data.map((session) => (
                  <Pressable
                    key={session.id}
                    className="flex-row items-center justify-between rounded-xl border border-border p-3"
                    onPress={() => router.push({ pathname: '/(history)/session/[id]', params: { id: session.id } })}
                  >
                    <View style={{ flexGrow: 1, flexShrink: 1, flexBasis: 0 }}>
                      <Text className="font-medium text-foreground" numberOfLines={1}>
                        {session.schedulerName}
                      </Text>
                      <Text className="text-xs text-muted-foreground">
                        {new Date(session.startedAt).toLocaleDateString('pt-BR')} • {session.correctCount}/
                        {session.answeredCount} de primeira
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.brandSoft} />
                  </Pressable>
                ))}
              </View>
            </Card>
          )}
        </ScrollView>
      )}
    </Screen>
  );
}
