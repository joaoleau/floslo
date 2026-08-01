import React, { useState } from 'react';
import { View, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Quiz } from '@/types/domain/RAG';

interface QuizChallengeProps {
  quiz: Quiz;
  currentIndex: number;
  totalQuizzes: number;
  onSuccess: () => void;
}

export function QuizChallenge({ quiz, currentIndex, totalQuizzes, onSuccess }: QuizChallengeProps) {
  const [wrongAnswerId, setWrongAnswerId] = useState<string | null>(null);
  const [correctAnswerId, setCorrectAnswerId] = useState<string | null>(null);

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

  return (
    // Adicionado flex-shrink e removido o p-6 (o padding agora fica no ScrollView)
    <View className="w-full max-w-sm bg-white rounded-3xl shadow-lg flex-shrink">
      <ScrollView
        showsVerticalScrollIndicator={true}
        // Usamos style inline para o padding do conteúdo para garantir compatibilidade no ScrollView
        contentContainerStyle={{ padding: 24, paddingBottom: 32 }}
      >
        <View className="gap-6">
          {/* HEADER: Tag, Dificuldade e Contador */}
          <View className="flex-row justify-between items-center border-b border-zinc-100 pb-3">
            <View className="flex-row items-center gap-2 flex-1">
              <Ionicons name="school" size={20} color="#33405C" />
              <Text className="font-semibold text-zinc-700" numberOfLines={1}>
                {quiz.tag} • <Text className={difficultyColor}>{quiz.difficulty}</Text>
              </Text>
            </View>
            <Text className="text-sm font-bold text-brand-100 ml-2">
              {currentIndex + 1} / {totalQuizzes}
            </Text>
          </View>

          {/* PERGUNTA */}
          <Text className="text-xl font-bold text-zinc-800 leading-snug">{quiz.question}</Text>

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
                      ? 'bg-red-50 border-red-400'
                      : isCorrect
                        ? 'bg-green-50 border-green-400'
                        : 'bg-zinc-50 border-zinc-200 active:bg-zinc-100'
                  }`}
                >
                  <Text
                    className={`flex-1 font-medium ${isWrong ? 'text-red-700' : isCorrect ? 'text-green-700' : 'text-zinc-700'}`}
                  >
                    {alt.text}
                  </Text>
                  {isWrong && <Ionicons name="close-circle" size={20} color="#EF4444" />}
                  {isCorrect && <Ionicons name="checkmark-circle" size={20} color="#10B981" />}
                </Pressable>
              );
            })}
          </View>

          {/* EXPLICAÇÃO E BOTÃO CONTINUAR (Só aparece quando acerta) */}
          {correctAnswerId && (
            <View className="mt-2 gap-4 animate-fade-in">
              <View className="bg-brand-50/20 p-4 rounded-xl border border-brand-50/30">
                <View className="flex-row items-center gap-2 mb-2">
                  <Ionicons name="bulb" size={18} color="#33405C" />
                  <Text className="font-bold text-brand-100">Explicação</Text>
                </View>
                <Text className="text-zinc-700 leading-relaxed text-sm">{quiz.explanation}</Text>
              </View>

              <Button onPress={onSuccess} className="bg-brand-100 rounded-xl h-12 flex-row items-center justify-center">
                <Text className="text-white font-bold text-lg">Continuar</Text>
                <Ionicons name="arrow-forward" size={20} color="white" style={{ marginLeft: 8 }} />
              </Button>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
