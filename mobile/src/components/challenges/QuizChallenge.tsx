import React, { useState } from 'react';
import { View, Pressable, ScrollView, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Quiz } from '@/types/domain/RAG';
import { useThemeColors } from '@/hooks/useThemeColors';

interface QuizChallengeProps {
  quiz: Quiz;
  currentIndex: number;
  totalQuizzes: number;
  onSuccess: () => void;
}

export function QuizChallenge({ quiz, currentIndex, totalQuizzes, onSuccess }: QuizChallengeProps) {
  const colors = useThemeColors();
  const [wrongAnswerId, setWrongAnswerId] = useState<string | null>(null);
  const [correctAnswerId, setCorrectAnswerId] = useState<string | null>(null);
  const [showSources, setShowSources] = useState(false);

  function handleSelectAlternative(alternativeId: string, isCorrect: boolean) {
    // Se já acertou, bloqueia novos cliques enquanto lê a explicação
    if (correctAnswerId) return;

    if (isCorrect) {
      setWrongAnswerId(null);
      setCorrectAnswerId(alternativeId); // Salva qual foi a correta para exibir a explicação
    } else {
      setWrongAnswerId(alternativeId);
    }
  }

  // Define a cor da badge de dificuldade
  const difficultyColor =
    quiz.difficulty.toLowerCase() === 'easy'
      ? 'text-green-600'
      : quiz.difficulty.toLowerCase() === 'medium'
        ? 'text-yellow-600'
        : 'text-red-600';
  const difficultyBg =
    quiz.difficulty.toLowerCase() === 'easy'
      ? 'bg-green-500/10'
      : quiz.difficulty.toLowerCase() === 'medium'
        ? 'bg-yellow-500/10'
        : 'bg-red-500/10';

  return (
    // flex-1 + w-full: preenche praticamente toda a área disponível na tela de alarme
    // (lateral e embaixo), não apenas uma caixinha centralizada.
    <View className="flex-1 w-full bg-card rounded-3xl shadow-lg overflow-hidden">
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={true}
        // Usamos style inline para o padding do conteúdo para garantir compatibilidade no ScrollView
        contentContainerStyle={{ padding: 24, paddingBottom: 32 }}
      >
        <View className="gap-6">
          {/* HEADER: Tag, Dificuldade e Contador — a dificuldade é um badge de largura fixa
              (não encolhe) e a tag trunca (flex-shrink), então o contador "1/5" nunca fica
              coberto independente do tamanho da tag. */}
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
                {quiz.tag}
              </Text>
              <View className={`rounded-full px-2 py-0.5 ${difficultyBg}`} style={{ flexShrink: 0 }}>
                <Text className={`text-xs font-bold uppercase ${difficultyColor}`}>{quiz.difficulty}</Text>
              </View>
            </View>
            <Text className="text-sm font-bold text-foreground" style={{ flexShrink: 0 }}>
              {currentIndex + 1} / {totalQuizzes}
            </Text>
          </View>

          {/* PERGUNTA */}
          <Text className="text-xl font-bold text-foreground leading-snug">{quiz.question}</Text>

          {/* ALTERNATIVAS */}
          <View className="gap-3">
            {quiz.alternatives.map((alt) => {
              const isWrong = wrongAnswerId === alt.id;
              const isCorrect = correctAnswerId === alt.id;

              return (
                <Pressable
                  key={alt.id}
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
                </Pressable>
              );
            })}
          </View>

          {/* EXPLICAÇÃO E BOTÃO CONTINUAR (Só aparece quando acerta) */}
          {correctAnswerId && (
            <View className="mt-2 gap-4 animate-fade-in">
              <View className="bg-muted p-4 rounded-xl border border-border">
                <View className="flex-row items-center justify-between mb-2">
                  <View className="flex-row items-center gap-2">
                    <Ionicons name="bulb" size={18} color={colors.brand} />
                    <Text className="font-bold text-foreground">Explicação</Text>
                  </View>

                  {quiz.sourceChunks.length > 0 && (
                    <Pressable hitSlop={8} onPress={() => setShowSources(true)}>
                      <Ionicons name="help-circle-outline" size={22} color={colors.brandSoft} />
                    </Pressable>
                  )}
                </View>
                <Text className="text-foreground leading-relaxed text-sm">{quiz.explanation}</Text>
              </View>

              <Button onPress={onSuccess} className="bg-brand-100 rounded-xl h-12 flex-row items-center justify-center">
                <Text className="text-white font-bold text-lg">Continuar</Text>
                <Ionicons name="arrow-forward" size={20} color="white" style={{ marginLeft: 8 }} />
              </Button>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Detalhe de onde a pergunta veio: os trechos (chunks) do material que embasaram a
          pergunta — documento de origem, página, posição do trecho e o quão relevante o
          modelo considerou aquele trecho. */}
      <Modal visible={showSources} transparent animationType="slide" onRequestClose={() => setShowSources(false)}>
        <View className="flex-1 justify-end bg-black/40">
          <Card className="max-h-[75%] rounded-t-3xl p-5 gap-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-lg font-semibold text-foreground">Baseado em</Text>
              <Pressable hitSlop={8} onPress={() => setShowSources(false)}>
                <Ionicons name="close" size={24} color={colors.brand} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View className="gap-3 pb-4">
                {quiz.sourceChunks.map((chunk, index) => (
                  <View key={`${chunk.objectKey}-${chunk.chunkIndex}-${index}`} className="rounded-xl border border-border bg-muted p-3 gap-2">
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center gap-1.5 flex-1 min-w-0">
                        <Ionicons name="document-text-outline" size={14} color={colors.brandSoft} />
                        <Text className="text-xs font-medium text-foreground flex-shrink overflow-hidden" numberOfLines={1}>
                          {chunk.objectKey}
                        </Text>
                      </View>
                      <Text className="text-xs font-semibold text-muted-foreground">
                        {Math.round(chunk.score * 100)}% relevante
                      </Text>
                    </View>

                    <Text className="text-xs text-muted-foreground">
                      Página {chunk.page} • Trecho #{chunk.chunkIndex + 1}
                    </Text>

                    <Text className="text-sm text-foreground leading-relaxed" numberOfLines={5}>
                      {chunk.content}
                    </Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          </Card>
        </View>
      </Modal>
    </View>
  );
}
