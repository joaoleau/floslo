import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { CHALLENGE_TYPE_META } from '@/constants/challengeType';
import { UserStats } from '@/types/domain/UserStats';
import { useThemeColors } from '@/hooks/useThemeColors';

interface UserStatsSummaryCardProps {
  stats: UserStats | undefined;
}

// Card "Resumo" -- usado tanto no Histórico quanto no Perfil, mesmo conteúdo
// (streak, schedulers, objetos e respondidos-por-tipo, todos vindos do backend
// via useUserStatsQuery). Extraído aqui pra não duplicar o mesmo JSX nas duas telas.
export function UserStatsSummaryCard({ stats }: UserStatsSummaryCardProps) {
  const colors = useThemeColors();

  return (
    <Card className="rounded-3xl p-5 gap-4">
      <Text className="text-lg font-semibold text-foreground">Resumo</Text>

      <View className="flex-row justify-between">
        <View className="items-center gap-1">
          <View className="flex-row items-center gap-1">
            <Ionicons name="flame" size={16} color={colors.brand} />
            <Text className="text-xl font-bold text-foreground">{stats?.streakDays ?? 0}</Text>
          </View>
          <Text className="text-xs text-muted-foreground">Dias seguidos</Text>
        </View>

        <View className="items-center gap-1">
          <View className="flex-row items-center gap-1">
            <Ionicons name="alarm" size={16} color={colors.brand} />
            <Text className="text-xl font-bold text-foreground">{stats?.schedulerCount ?? 0}</Text>
          </View>
          <Text className="text-xs text-muted-foreground">Agendadores</Text>
        </View>

        <View className="items-center gap-1">
          <View className="flex-row items-center gap-1">
            <Ionicons name="document-text" size={16} color={colors.brand} />
            <Text className="text-xl font-bold text-foreground">{stats?.objectCount ?? 0}</Text>
          </View>
          <Text className="text-xs text-muted-foreground">Objetos</Text>
        </View>
      </View>

      <View className="gap-2 pt-2 border-t border-border">
        <Text className="text-xs font-medium text-muted-foreground pt-2">Respondidos por tipo</Text>
        {(Object.keys(CHALLENGE_TYPE_META) as (keyof typeof CHALLENGE_TYPE_META)[]).map((type) => {
          const meta = CHALLENGE_TYPE_META[type];
          return (
            <View key={type} className="flex-row items-center gap-2">
              <Ionicons name={meta.icon} size={16} color={meta.color} />
              <Text className="flex-1 text-foreground">{meta.label}</Text>
              <Text className="text-sm font-bold text-foreground">{stats?.answeredByType[type] ?? 0}</Text>
            </View>
          );
        })}
      </View>
    </Card>
  );
}
