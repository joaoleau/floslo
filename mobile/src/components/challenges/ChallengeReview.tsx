import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { useThemeColors } from '@/hooks/useThemeColors';

// Modo leitura de um desafio já respondido (Múltipla escolha/V-F) -- usado tanto na revisão do
// histórico (mobile/src/app/(history)/attempt/[id].tsx) quanto pra voltar/revisar um
// desafio já respondido dentro da própria sessão de firing (mobile/src/app/(scheduler)/
// firing.tsx). Não marca qual alternativa errada específica foi escolhida (só a
// contagem de erros), já que essa granularidade não é guardada.
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
  return (
    <View className="gap-4">
      <Text className="text-xl font-bold text-foreground leading-snug">{promptText}</Text>

      <View className="gap-3">
        {options.map((option) => (
          <View
            key={option.id}
            className={`w-full p-4 rounded-xl border flex-row items-center justify-between ${
              option.correct ? 'bg-green-500/10 border-green-500' : 'bg-muted border-border'
            }`}
          >
            <Text className={`flex-1 font-medium ${option.correct ? 'text-green-600' : 'text-foreground'}`}>
              {option.text}
            </Text>
            {option.correct && <Ionicons name="checkmark-circle" size={20} color={colors.success} />}
          </View>
        ))}
      </View>

      {wrongAttempts > 0 && (
        <Text className="text-sm text-muted-foreground">Errou {wrongAttempts}x antes de acertar</Text>
      )}

      {explanationText && (
        <View className="bg-muted p-4 rounded-xl border border-border gap-2">
          <View className="flex-row items-center gap-2">
            <Ionicons name="bulb" size={18} color={colors.brand} />
            <Text className="font-bold text-foreground">Explicação</Text>
          </View>
          <Text className="text-foreground leading-relaxed text-sm">{explanationText}</Text>
        </View>
      )}
    </View>
  );
}

// Modo leitura da Descoberta: o título em destaque e, abaixo, o conteúdo.
export function DiscoveryReview({ promptText, explanationText }: { promptText: string; explanationText: string | null }) {
  const showTitle = !!explanationText && promptText !== explanationText;

  return (
    <Card className="rounded-3xl p-6 gap-3">
      {showTitle && <Text className="text-center text-2xl font-bold text-foreground leading-snug">{promptText}</Text>}
      <Text className="text-center text-base text-foreground leading-relaxed">{explanationText ?? promptText}</Text>
    </Card>
  );
}
