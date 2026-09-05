import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/text';
import { TagStat } from '@/types/domain/History';
import { useThemeColors } from '@/hooks/useThemeColors';

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
  const percent = stat.accuracy !== null ? Math.round(stat.accuracy * 100) : null;
  const barColor = stat.accuracy !== null ? accuracyColor(stat.accuracy, colors) : colors.brandSoft;

  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-3 rounded-xl border border-border p-3"
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
            {stat.total} {stat.total === 1 ? 'resposta' : 'respostas'}
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
            {stat.hasEnoughData ? 'Sem desafios com certo/errado nesse assunto' : 'Ainda pouco dado pra um insight'}
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
