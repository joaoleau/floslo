import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { useTranslation } from 'react-i18next';
import { useThemeColors } from '@/hooks/useThemeColors';
import { alternativeLetter } from '@/lib/shuffle';

export function ChoiceReview({
  promptText,
  explanationText,
  options,
  wrongAttempts,
  colors,
}: {
  promptText: string;
  explanationText: string | null;
  options: { id: string; text: string; correct: boolean }[];
  wrongAttempts: number;
  colors: ReturnType<typeof useThemeColors>;
}) {
  const { t } = useTranslation();
  function optionText(option: { id: string; text: string }) {
    if (option.id === 'TRUE') return t('challenges.trueFalse.true');
    if (option.id === 'FALSE') return t('challenges.trueFalse.false');
    return option.text;
  }
  const isTrueFalse = options.some((option) => option.id === 'TRUE' || option.id === 'FALSE');

  return (
    <View className="gap-4">
      <Text className="text-xl font-bold text-foreground leading-snug">{promptText}</Text>

      <View className="gap-3">
        {options.map((option, index) => (
          <View
            key={option.id}
            className={`w-full p-4 rounded-xl border flex-row items-center justify-between ${
              option.correct ? 'bg-green-500/10 border-green-500' : 'bg-muted border-border'
            }`}
          >
            {!isTrueFalse && (
              <Text className={`mr-3 font-bold ${option.correct ? 'text-green-600' : 'text-muted-foreground'}`}>
                {alternativeLetter(index)}
              </Text>
            )}
            <Text className={`flex-1 font-medium ${option.correct ? 'text-green-600' : 'text-foreground'}`}>
              {optionText(option)}
            </Text>
            {option.correct && <Ionicons name="checkmark-circle" size={20} color={colors.success} />}
          </View>
        ))}
      </View>

      {wrongAttempts > 0 && (
        <Text className="text-sm text-muted-foreground">{t('history.session.wrongBeforeRight', { count: wrongAttempts })}</Text>
      )}

      {explanationText && (
        <View className="bg-muted p-4 rounded-xl border border-border gap-2">
          <View className="flex-row items-center gap-2">
            <Ionicons name="bulb" size={18} color={colors.brand} />
            <Text className="font-bold text-foreground">{t('challenges.explanation')}</Text>
          </View>
          <Text className="text-foreground leading-relaxed text-sm">{explanationText}</Text>
        </View>
      )}
    </View>
  );
}

export function DiscoveryReview({ promptText, explanationText }: { promptText: string; explanationText: string | null }) {
  const showTitle = !!explanationText && promptText !== explanationText;

  return (
    <Card className="rounded-3xl p-6 gap-3">
      {showTitle && <Text className="text-center text-2xl font-bold text-foreground leading-snug">{promptText}</Text>}
      <Text className="text-center text-base text-foreground leading-relaxed">{explanationText ?? promptText}</Text>
    </Card>
  );
}
