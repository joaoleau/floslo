import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/text';
import { useTranslation } from 'react-i18next';
import { TagStat } from '@/types/domain/History';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTheme } from '@/lib/ThemeProvider';
import { getCardEdgeColor } from '@/lib/cardEdge';
import { getColorForId } from '@/lib/hashColor';

interface TagAccuracyRowProps {
  stat: TagStat;
  onPress: () => void;
}

function accuracyColor(accuracy: number, colors: ReturnType<typeof useThemeColors>): string {
  if (accuracy >= 0.7) return colors.success;
  if (accuracy >= 0.4) return '#d97706';
  return colors.destructive;
}

export function TagAccuracyRow({ stat, onPress }: TagAccuracyRowProps) {
  const colors = useThemeColors();
  const { t } = useTranslation();
  const { mode } = useTheme();
  const percent = stat.accuracy !== null ? Math.round(stat.accuracy * 100) : null;
  const barColor = stat.accuracy !== null ? accuracyColor(stat.accuracy, colors) : colors.brandSoft;
  // Cor própria por assunto (mesma paleta vibrante usada em Agendadores/Objetos), fixa
  // pelo id do tag -- diferente da cor da barra/porcentagem, que continua semântica
  // (verde/âmbar/vermelho por acerto). Sem isso, todo assunto sem dado suficiente pra
  // ter uma taxa de acerto ainda (o caso mais comum) caía no mesmo cinza neutro.
  const identityColor = getColorForId(stat.tag);

  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-3 rounded-xl border border-border p-3"
      style={{
        borderLeftWidth: 4,
        borderLeftColor: identityColor,
        borderBottomWidth: 2,
        borderBottomColor: getCardEdgeColor(mode),
      }}
    >
      <View style={{ flexGrow: 1, flexShrink: 1, flexBasis: 0, gap: 6 }}>
        <View className="flex-row items-center justify-between gap-2">
          <Text
            className="font-semibold text-foreground"
            style={{ flexShrink: 1 }}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {stat.tag}
          </Text>
          <Text className="text-xs text-muted-foreground" style={{ flexShrink: 0 }}>
            {t('history.tag.answers', { count: stat.total })}
          </Text>
        </View>

        {stat.hasEnoughData && percent !== null ? (
          <View className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <View
              style={{ width: `${percent}%` as const, backgroundColor: barColor }}
              className="h-full rounded-full"
            />
          </View>
        ) : (
          <Text className="text-xs text-muted-foreground">
            {stat.hasEnoughData ? t('history.tag.noGraded') : t('history.tag.notEnoughDataShort')}
          </Text>
        )}
      </View>

      {percent !== null && stat.hasEnoughData && (
        <Text className="text-sm font-bold" style={{ color: barColor }}>
          {percent}%
        </Text>
      )}
      <Ionicons name="chevron-forward" size={16} color={colors.brandSoft} />
    </Pressable>
  );
}
