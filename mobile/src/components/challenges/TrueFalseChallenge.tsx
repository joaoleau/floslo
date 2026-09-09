import React, { useRef, useState } from 'react';
import { View, Pressable, ScrollView, Modal } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AnimatedChoice } from '@/components/challenges/AnimatedChoice';
import { TrueFalseItem } from '@/types/domain/RAG';
import { useThemeColors } from '@/hooks/useThemeColors';
import { ChallengeResult } from '@/types/domain/History';

interface TrueFalseChallengeProps {
  item: TrueFalseItem;
  currentIndex: number;
  totalItems: number;
  onSuccess: (result: ChallengeResult) => void;
}

const OPTIONS = [
  { id: 'TRUE', label: 'Verdadeiro', value: true },
  { id: 'FALSE', label: 'Falso', value: false },
] as const;

export function TrueFalseChallenge({ item, currentIndex, totalItems, onSuccess }: TrueFalseChallengeProps) {
  const colors = useThemeColors();
  const [wrongOptionId, setWrongOptionId] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const wrongAttemptsRef = useRef(0);

  function handleSelectOption(optionId: string, value: boolean) {
    if (answered) return;

    if (value === item.answer) {
      setWrongOptionId(null);
      setAnswered(true);
    } else {
      wrongAttemptsRef.current += 1;
      setWrongOptionId(optionId);
    }
  }

  function handleContinue() {
    onSuccess({ wrongAttempts: wrongAttemptsRef.current });
  }

  const difficultyColor =
    item.difficulty.toLowerCase() === 'easy'
      ? 'text-green-600'
      : item.difficulty.toLowerCase() === 'medium'
        ? 'text-yellow-600'
        : 'text-red-600';
  const difficultyBg =
    item.difficulty.toLowerCase() === 'easy'
      ? 'bg-green-500/10'
      : item.difficulty.toLowerCase() === 'medium'
        ? 'bg-yellow-500/10'
        : 'bg-red-500/10';

  return (
    <Animated.View entering={FadeInDown.duration(300)} className="flex-1 w-full bg-card rounded-3xl shadow-lg overflow-hidden">
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={true}
        contentContainerStyle={{ padding: 24, paddingBottom: 32 }}
      >
        <View className="gap-6">
          <View className="flex-row justify-between items-center gap-2 border-b border-border pb-3">
            <View
              className="flex-row items-center gap-2"
              style={{ flexGrow: 1, flexShrink: 1, flexBasis: 0, overflow: 'hidden' }}
            >
              <Ionicons name="checkmark-done" size={20} color={colors.brand} />
              <Text
                className="font-semibold text-foreground"
                style={{ flexShrink: 1, overflow: 'hidden' }}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {item.tag}
              </Text>
              <View className={`rounded-full px-2 py-0.5 ${difficultyBg}`} style={{ flexShrink: 0 }}>
                <Text className={`text-xs font-bold uppercase ${difficultyColor}`}>{item.difficulty}</Text>
              </View>
            </View>
            <Text className="text-sm font-bold text-foreground" style={{ flexShrink: 0 }}>
              {currentIndex + 1} / {totalItems}
            </Text>
          </View>

          <Text className="text-xl font-bold text-foreground leading-snug">{item.statement}</Text>

          <View className="gap-3">
            {OPTIONS.map((option) => {
              const isWrong = wrongOptionId === option.id;
              const isCorrect = answered && option.value === item.answer;

              return (
                <AnimatedChoice
                  key={option.id}
                  isWrong={isWrong}
                  isCorrect={isCorrect}
                  onPress={() => handleSelectOption(option.id, option.value)}
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
                    {option.label}
                  </Text>
                  {isWrong && <Ionicons name="close-circle" size={20} color={colors.destructive} />}
                  {isCorrect && <Ionicons name="checkmark-circle" size={20} color={colors.success} />}
                </AnimatedChoice>
              );
            })}
          </View>

          {answered && (
            <Animated.View entering={FadeInDown.duration(250)} className="mt-2 gap-4">
              <View className="bg-muted p-4 rounded-xl border border-border">
                <View className="flex-row items-center justify-between mb-2">
                  <View className="flex-row items-center gap-2">
                    <Ionicons name="bulb" size={18} color={colors.brand} />
                    <Text className="font-bold text-foreground">Explicação</Text>
                  </View>

                  {item.sourceChunks.length > 0 && (
                    <Pressable hitSlop={8} onPress={() => setShowSources(true)}>
                      <Ionicons name="help-circle-outline" size={22} color={colors.brandSoft} />
                    </Pressable>
                  )}
                </View>
                <Text className="text-foreground leading-relaxed text-sm">{item.explanation}</Text>
              </View>

              <Button onPress={handleContinue} className="bg-brand-100 rounded-xl h-12 flex-row items-center justify-center">
                <Text className="text-white font-bold text-lg">Continuar</Text>
                <Ionicons name="arrow-forward" size={20} color="white" style={{ marginLeft: 8 }} />
              </Button>
            </Animated.View>
          )}
        </View>
      </ScrollView>

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
                {[...item.sourceChunks].sort((a, b) => b.score - a.score).map((chunk, index) => (
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
    </Animated.View>
  );
}
