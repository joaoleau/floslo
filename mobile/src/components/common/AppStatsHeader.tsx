import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '@/components/ui/text';
import { CHALLENGE_TYPE_META } from '@/constants/challengeType';
import { ChallengeType } from '@/types/domain/History';
import { useUserStatsQuery } from '@/hooks/useHistory';

const CHALLENGE_TYPES = Object.keys(CHALLENGE_TYPE_META) as ChallengeType[];
const BAR_HEIGHT = 30;

// Widget da tela de Agendadores (não é mais um header global entre abas -- cada tela
// mostra o que faz sentido pra ela): barra segmentada com a proporção de desafios
// respondidos por tipo (ícone + quantidade dentro da mesma pílula translúcida em cada
// segmento -- tipos com zero respostas não geram segmento) e a badge de sequência colada
// no fim da barra, mesma altura, pra ler como uma peça só.
export function AppStatsHeader() {
  const { data: stats } = useUserStatsQuery();

  const streakDays = stats?.streakDays ?? 0;
  const answeredByType = stats?.answeredByType;
  const total = CHALLENGE_TYPES.reduce((sum, type) => sum + (answeredByType?.[type] ?? 0), 0);

  return (
    <View className="flex-row items-center gap-2" style={{ height: BAR_HEIGHT }}>
      <View className="flex-1 flex-row overflow-hidden rounded-full bg-muted" style={{ height: BAR_HEIGHT }}>
        {total > 0 &&
          CHALLENGE_TYPES.map((type) => {
            const count = answeredByType?.[type] ?? 0;
            if (count === 0) return null;
            const meta = CHALLENGE_TYPE_META[type];
            return (
              <View
                key={type}
                className="items-center justify-center"
                style={{ flex: count, backgroundColor: meta.color }}
              >
                <View className="flex-row items-center gap-0.5 rounded-full bg-white/25 px-1 py-0.5">
                  <Ionicons name={meta.icon} size={9} color="#FFFFFF" />
                  <Text className="text-[10px] font-bold text-white">{count}</Text>
                </View>
              </View>
            );
          })}
      </View>

      <View
        className="flex-row items-center gap-1 rounded-full px-2.5"
        style={{ height: BAR_HEIGHT, backgroundColor: '#F59E0B' }}
      >
        <Ionicons name="flame" size={13} color="#FFFFFF" />
        <Text className="text-xs font-bold text-white">{streakDays}</Text>
      </View>
    </View>
  );
}
