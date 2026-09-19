import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from '@/components/common/Screen';
import { Header } from '@/components/common/Header';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { TagAccuracyRow } from '@/components/history/TagAccuracyRow';
import { StudyWeekStrip } from '@/components/history/StudyWeekStrip';
import { CHALLENGE_TYPE_META } from '@/constants/challengeType';
import { getColorForId } from '@/lib/hashColor';
import { getCardEdgeColor } from '@/lib/cardEdge';

import {
  useRecentMistakesQuery,
  useSessionsQuery,
  useStudyActivityQuery,
  useTagBreakdownQuery,
} from '@/hooks/useHistory';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTheme } from '@/lib/ThemeProvider';

export default function HistoryScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const { mode } = useTheme();
  // ScrollView.indicatorStyle só aceita 'black'/'white'/'default' -- o 'default' (cinza
  // claro do sistema) ficava quase invisível em cima do fundo claro do app no modo light,
  // parecendo que a seção não rolava. persistentScrollbar (Android) mantém a barra
  // sempre visível em vez de só durante o toque.
  const scrollIndicatorStyle = mode === 'dark' ? 'white' : 'black';

  const tagsQuery = useTagBreakdownQuery();
  const mistakesQuery = useRecentMistakesQuery(8);
  const sessionsQuery = useSessionsQuery(10);
  const activityQuery = useStudyActivityQuery(30);

  const isPending = tagsQuery.isPending;
  const isError = tagsQuery.isError;
  const totalAnswered = tagsQuery.data ? tagsQuery.data.reduce((sum, stat) => sum + stat.total, 0) : 0;

  function retryAll() {
    tagsQuery.refetch();
    mistakesQuery.refetch();
    sessionsQuery.refetch();
    activityQuery.refetch();
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
        <View className="flex-1 px-4">
          <EmptyState
            icon="extension-puzzle-outline"
            title="Nada por aqui ainda"
            description="Responda seus agendadores e acompanhe aqui em quais temas você vai bem e quais precisa reforçar."
            actionLabel="Ver meus agendadores"
            onAction={() => router.push('/(tabs)')}
            color="#8B5CF6"
          />
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-4 p-4 pb-28"
          showsVerticalScrollIndicator={false}
        >
          {!!activityQuery.data && (
            <Card className="rounded-3xl p-5 gap-4">
              <Text className="text-lg font-semibold text-foreground">Sua sequência de estudos</Text>
              <StudyWeekStrip activity={activityQuery.data} weeksBack={4} />
            </Card>
          )}

          {tagsQuery.data && tagsQuery.data.length > 0 && (
            <Card className="rounded-3xl p-5 gap-4">
              <Text className="text-lg font-semibold text-foreground">Por assunto</Text>
              {/* Altura fixa com scroll próprio -- sem isso, uma lista longa de assuntos
                  empurrava as seções seguintes pra baixo da tela toda, virando uma rolagem
                  só, sem fim, difícil de navegar entre seções. */}
              <ScrollView style={{ maxHeight: 280 }} nestedScrollEnabled showsVerticalScrollIndicator indicatorStyle={scrollIndicatorStyle} persistentScrollbar>
                <View className="gap-2">
                  {tagsQuery.data.map((stat) => (
                    <TagAccuracyRow
                      key={stat.tag}
                      stat={stat}
                      onPress={() => router.push({ pathname: '/(history)/tag/[tag]', params: { tag: stat.tag } })}
                    />
                  ))}
                </View>
              </ScrollView>
            </Card>
          )}

          {mistakesQuery.data && mistakesQuery.data.length > 0 && (
            <Card className="rounded-3xl p-5 gap-4">
              <Text className="text-lg font-semibold text-foreground">Erros recentes</Text>
              <ScrollView style={{ maxHeight: 320 }} nestedScrollEnabled showsVerticalScrollIndicator indicatorStyle={scrollIndicatorStyle} persistentScrollbar>
                <View className="gap-3">
                  {mistakesQuery.data.map((mistake) => {
                    const meta = CHALLENGE_TYPE_META[mistake.challengeType];
                    return (
                      <View
                        key={mistake.id}
                        className="rounded-xl border border-border p-3 gap-1.5"
                        style={{ borderBottomWidth: 2, borderBottomColor: getCardEdgeColor(mode) }}
                      >
                        <View className="flex-row items-center gap-1.5">
                          <View
                            className="items-center justify-center rounded-full"
                            style={{ width: 22, height: 22, backgroundColor: `${meta.color}22` }}
                          >
                            <Ionicons name={meta.icon} size={12} color={meta.color} />
                          </View>
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
              </ScrollView>
            </Card>
          )}

          {sessionsQuery.data && sessionsQuery.data.length > 0 && (
            <Card className="rounded-3xl p-5 gap-4">
              <Text className="text-lg font-semibold text-foreground">Sessões recentes</Text>
              <View className="gap-2">
                {sessionsQuery.data.map((session) => {
                  const schedulerColor = getColorForId(session.schedulerId);
                  return (
                    <Pressable
                      key={session.id}
                      className="flex-row items-center gap-3 justify-between rounded-xl border border-border p-3"
                      style={{ borderBottomWidth: 2, borderBottomColor: getCardEdgeColor(mode) }}
                      onPress={() => router.push({ pathname: '/(history)/session/[id]', params: { id: session.id } })}
                    >
                      <View
                        className="rounded-full"
                        style={{ width: 8, height: 8, backgroundColor: schedulerColor, flexShrink: 0 }}
                      />
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
                  );
                })}
              </View>
            </Card>
          )}
        </ScrollView>
      )}
    </Screen>
  );
}
