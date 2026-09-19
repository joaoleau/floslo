import React, { useState } from 'react';
import { View, Pressable, ScrollView, Modal } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Flashcard } from '@/types/domain/RAG';
import { useThemeColors } from '@/hooks/useThemeColors';
import { ChallengeResult } from '@/types/domain/History';

interface FlashcardChallengeProps {
  flashcard: Flashcard;
  currentIndex: number;
  totalFlashcards: number;
  onSuccess: (result: ChallengeResult) => void;
}

// O flashcard aqui não é pergunta/resposta -- é um conteúdo já "mastigado" (um fato, uma
// curiosidade, um conceito já explicado) pra o usuário só ler. Não tem certo/errado, então a
// única interação é confirmar leitura, no mesmo botão "Continuar" usado por Quiz/V-F --
// navegar entre desafios (inclusive voltar pra revisar um já lido) é responsabilidade do
// pager no firing.tsx, não deste componente.
export function FlashcardChallenge({ flashcard, currentIndex, totalFlashcards, onSuccess }: FlashcardChallengeProps) {
  const colors = useThemeColors();
  const [showSources, setShowSources] = useState(false);

  function handleContinue() {
    onSuccess({ wrongAttempts: 0 });
  }

  return (
    <View className="flex-1 w-full items-center justify-center px-1">
      <Animated.View
        entering={FadeInDown.duration(300)}
        className="flex-1 w-full bg-card rounded-3xl shadow-lg overflow-hidden"
      >
        <View className="p-6 pb-3 border-b border-border flex-row items-center justify-between gap-2">
          <View
            className="flex-row items-center gap-2"
            style={{ flexGrow: 1, flexShrink: 1, flexBasis: 0, overflow: 'hidden' }}
          >
            <Ionicons name="sparkles" size={20} color={colors.brand} />
            <Text
              className="font-semibold text-foreground"
              style={{ flexShrink: 1, overflow: 'hidden' }}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {flashcard.tag}
            </Text>
            {flashcard.sourceChunks.length > 0 && (
              <Pressable hitSlop={8} onPress={() => setShowSources(true)}>
                <Ionicons name="help-circle-outline" size={20} color={colors.brandSoft} />
              </Pressable>
            )}
          </View>
          <Text className="text-sm font-bold text-foreground" style={{ flexShrink: 0 }}>
            {currentIndex + 1} / {totalFlashcards}
          </Text>
        </View>

        <View className="flex-1">
          <Ionicons
            name="chatbox-ellipses"
            size={96}
            color={colors.brand}
            style={{ position: 'absolute', top: -8, right: -12, opacity: 0.06 }}
          />
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}
          >
            {!!flashcard.title && (
              <Text className="text-center text-2xl font-bold text-foreground leading-snug mb-3">{flashcard.title}</Text>
            )}
            <Text className="text-center text-base text-foreground leading-relaxed">{flashcard.content}</Text>
          </ScrollView>
        </View>

        <View className="p-4 pt-0">
          <Button onPress={handleContinue} className="bg-brand-100 rounded-3xl h-12 flex-row items-center justify-center">
            <Text className="text-white font-bold text-lg">Continuar</Text>
            <Ionicons name="arrow-forward" size={20} color="white" style={{ marginLeft: 8 }} />
          </Button>
        </View>
      </Animated.View>

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
                {[...flashcard.sourceChunks].sort((a, b) => b.score - a.score).map((chunk, index) => (
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
