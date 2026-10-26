import React, { useRef, useState } from 'react';
import { View, Pressable, ScrollView } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/text';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { AnimatedChoice } from '@/components/challenges/AnimatedChoice';
import { MultipleChoice } from '@/types/domain/RAG';
import { useThemeColors } from '@/hooks/useThemeColors';
import { SourceChunksSheet } from '@/components/challenges/SourceChunksSheet';
import { ChallengeResult } from '@/types/domain/History';

interface MultipleChoiceChallengeProps {
  item: MultipleChoice;
  currentIndex: number;
  totalItems: number;
  onSuccess: (result: ChallengeResult) => void;
}

export function MultipleChoiceChallenge({ item, currentIndex, totalItems, onSuccess }: MultipleChoiceChallengeProps) {
  const colors = useThemeColors();
  const { t } = useTranslation();
  const [wrongAnswerId, setWrongAnswerId] = useState<string | null>(null);
  const [correctAnswerId, setCorrectAnswerId] = useState<string | null>(null);
  const [showSources, setShowSources] = useState(false);
  const wrongAttemptsRef = useRef(0);

  function handleSelectAlternative(alternativeId: string, isCorrect: boolean) {
    // Se já acertou, bloqueia novos cliques enquanto lê a explicação
    if (correctAnswerId) return;

    if (isCorrect) {
      setWrongAnswerId(null);
      setCorrectAnswerId(alternativeId); // Salva qual foi a correta para exibir a explicação
    } else {
      wrongAttemptsRef.current += 1;
      setWrongAnswerId(alternativeId);
    }
  }

  function handleContinue() {
    onSuccess({ wrongAttempts: wrongAttemptsRef.current });
  }

  return (
    // flex-1 + w-full: preenche praticamente toda a área disponível na tela de alarme
    // (lateral e embaixo), não apenas uma caixinha centralizada. entering: desliza/aparece
    // suave a cada novo desafio (remonta com key nova em firing.tsx a cada troca).
    <Animated.View entering={FadeInDown.duration(300)} className="flex-1 w-full bg-card rounded-3xl shadow-lg overflow-hidden">
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={true}
        // Usamos style inline para o padding do conteúdo para garantir compatibilidade no ScrollView
        contentContainerStyle={{ padding: 24, paddingBottom: 32 }}
      >
        <View className="gap-6">
          {/* HEADER: Tag e Contador — a tag trunca (flex-shrink), então o contador "1/5"
              nunca fica coberto independente do tamanho da tag. */}
          <View className="flex-row justify-between items-center gap-2 border-b border-border pb-3">
            <View
              className="flex-row items-center gap-2"
              style={{ flexGrow: 1, flexShrink: 1, flexBasis: 0, overflow: 'hidden' }}
            >
              <Ionicons name="school" size={20} color={colors.brand} />
              <Text
                className="font-semibold text-foreground"
                style={{ flexShrink: 1, overflow: 'hidden' }}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {item.tag}
              </Text>
            </View>
            <Text className="text-sm font-bold text-foreground" style={{ flexShrink: 0 }}>
              {currentIndex + 1} / {totalItems}
            </Text>
          </View>

          {/* PERGUNTA */}
          <Text className="text-xl font-bold text-foreground leading-snug">{item.question}</Text>

          {/* ALTERNATIVAS */}
          <View className="gap-3">
            {item.alternatives.map((alt) => {
              const isWrong = wrongAnswerId === alt.id;
              const isCorrect = correctAnswerId === alt.id;

              return (
                <AnimatedChoice
                  key={alt.id}
                  isWrong={isWrong}
                  isCorrect={isCorrect}
                  onPress={() => handleSelectAlternative(alt.id, alt.correct)}
                  className={`w-full p-4 rounded-xl border flex-row items-center justify-between ${
                    isWrong
                      ? 'bg-red-500/10 border-red-500'
                      : isCorrect
                        ? 'bg-green-500/10 border-green-500'
                        : 'bg-muted border-border active:bg-secondary'
                  }`}
                >
                  <Text
                    className={`flex-1 font-medium ${isWrong ? 'text-red-600' : isCorrect ? 'text-green-600' : 'text-foreground'}`}
                  >
                    {alt.text}
                  </Text>
                  {isWrong && <Ionicons name="close-circle" size={20} color={colors.destructive} />}
                  {isCorrect && <Ionicons name="checkmark-circle" size={20} color={colors.success} />}
                </AnimatedChoice>
              );
            })}
          </View>

          {/* EXPLICAÇÃO E BOTÃO CONTINUAR (Só aparece quando acerta) */}
          {correctAnswerId && (
            <Animated.View entering={FadeInDown.duration(250)} className="mt-2 gap-4">
              <View className="bg-muted p-4 rounded-xl border border-border">
                <View className="flex-row items-center justify-between mb-2">
                  <View className="flex-row items-center gap-2">
                    <Ionicons name="bulb" size={18} color={colors.brand} />
                    <Text className="font-bold text-foreground">{t('challenges.explanation')}</Text>
                  </View>

                  {item.sourceChunks.length > 0 && (
                    <Pressable hitSlop={8} onPress={() => setShowSources(true)}>
                      <Ionicons name="help-circle-outline" size={22} color={colors.brandSoft} />
                    </Pressable>
                  )}
                </View>
                <Text className="text-foreground leading-relaxed text-sm">{item.explanation}</Text>
              </View>

              <Button onPress={handleContinue} className="bg-brand-100 rounded-3xl h-12 flex-row items-center justify-center">
                <Text className="text-white font-bold text-lg">{t('challenges.continue')}</Text>
                <Ionicons name="arrow-forward" size={20} color="white" style={{ marginLeft: 8 }} />
              </Button>
            </Animated.View>
          )}
        </View>
      </ScrollView>

      <SourceChunksSheet visible={showSources} chunks={item.sourceChunks} onClose={() => setShowSources(false)} />
    </Animated.View>
  );
}
