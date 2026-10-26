import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from '@/components/common/Screen';
import { Header } from '@/components/common/Header';
import { ErrorState } from '@/components/common/ErrorState';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { CHALLENGE_TYPE_META } from '@/constants/challengeType';

import { useSessionDetailQuery } from '@/hooks/useHistory';
import { useThemeColors } from '@/hooks/useThemeColors';
import { sessionScoreLabel } from '@/lib/sessionScore';

export default function SessionDetailScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: session, isPending, isError, refetch } = useSessionDetailQuery(id);

  return (
    <Screen edges={['top', 'left', 'right']}>
      <Header title="Sessão" />

      {isPending ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      ) : isError || !session ? (
        <ErrorState message="Não foi possível carregar essa sessão." onRetry={() => refetch()} />
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-4 p-4 pb-28"
          showsVerticalScrollIndicator={false}
        >
          <Card className="rounded-3xl p-5 gap-4">
            <Text className="text-lg font-semibold text-foreground">{session.schedulerName}</Text>
            <Text className="text-sm text-muted-foreground">
              {new Date(session.startedAt).toLocaleString('pt-BR')}
            </Text>
            <Text className="text-sm text-muted-foreground">
              {sessionScoreLabel(session)}
              {!session.completedAt && ' • sessão não concluída'}
            </Text>
          </Card>

          <View className="gap-3">
            {session.attempts.map((attempt) => {
              const meta = CHALLENGE_TYPE_META[attempt.challengeType];
              return (
                <Pressable
                  key={attempt.id}
                  onPress={() => router.push({ pathname: '/(history)/attempt/[id]', params: { id: attempt.id } })}
                >
                  <Card className="rounded-2xl p-4 gap-2">
                    <View className="flex-row items-center justify-between gap-2">
                      <View className="flex-row items-center gap-1.5" style={{ flexShrink: 1 }}>
                        <Ionicons name={meta.icon} size={14} color={meta.color} />
                        <Text className="text-xs font-medium text-muted-foreground" numberOfLines={1}>
                          {attempt.tag}
                        </Text>
                      </View>
                      {attempt.isCorrect !== null && (
                        <Ionicons
                          name={attempt.isCorrect ? 'checkmark-circle' : 'close-circle'}
                          size={18}
                          color={attempt.isCorrect ? colors.success : colors.destructive}
                        />
                      )}
                    </View>
                    <Text className="text-sm font-medium text-foreground">{attempt.promptText}</Text>
                    {attempt.wrongAttempts > 0 && (
                      <Text className="text-xs text-muted-foreground">
                        Errou {attempt.wrongAttempts}x antes de acertar
                      </Text>
                    )}
                  </Card>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      )}
    </Screen>
  );
}
