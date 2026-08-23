import React, { useState } from 'react';
import { View, Pressable, ScrollView, Modal, Dimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  interpolate,
  Extrapolation,
  runOnJS,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { Flashcard } from '@/types/domain/RAG';
import { useThemeColors } from '@/hooks/useThemeColors';

interface FlashcardChallengeProps {
  flashcard: Flashcard;
  currentIndex: number;
  totalFlashcards: number;
  onSuccess: () => void;
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.28;
const SWIPE_VELOCITY_THRESHOLD = 800;

// O flashcard aqui não é pergunta/resposta -- é um conteúdo já "mastigado" (um fato, uma
// curiosidade, um conceito já explicado) pra o usuário só ler. Não tem certo/errado, então a
// única interação é arrastar pro lado pra ir pro próximo (flashcard ou desafio seguinte).
export function FlashcardChallenge({ flashcard, currentIndex, totalFlashcards, onSuccess }: FlashcardChallengeProps) {
  const colors = useThemeColors();
  const [showSources, setShowSources] = useState(false);
  const translateX = useSharedValue(0);

  const pan = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onChange((event) => {
      translateX.value += event.changeX;
    })
    .onEnd((event) => {
      const pastThreshold = Math.abs(translateX.value) > SWIPE_THRESHOLD;
      const pastVelocity = Math.abs(event.velocityX) > SWIPE_VELOCITY_THRESHOLD;

      if (pastThreshold || pastVelocity) {
        const direction = translateX.value >= 0 ? 1 : -1;
        translateX.value = withTiming(direction * SCREEN_WIDTH * 1.2, { duration: 220 }, (finished) => {
          if (finished) {
            runOnJS(onSuccess)();
          }
        });
      } else {
        translateX.value = withSpring(0, { damping: 16, stiffness: 180 });
      }
    });

  const cardStyle = useAnimatedStyle(() => {
    const rotate = interpolate(translateX.value, [-SCREEN_WIDTH / 2, SCREEN_WIDTH / 2], [-12, 12], Extrapolation.CLAMP);
    return {
      transform: [{ translateX: translateX.value }, { rotate: `${rotate}deg` }],
    };
  });

  const leftHintStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-SWIPE_THRESHOLD, -20], [1, 0], Extrapolation.CLAMP),
  }));
  const rightHintStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [20, SWIPE_THRESHOLD], [0, 1], Extrapolation.CLAMP),
  }));

  return (
    <View className="flex-1 w-full items-center justify-center px-1">
      <Animated.View
        pointerEvents="none"
        style={[{ position: 'absolute', left: 12, zIndex: 1 }, leftHintStyle]}
      >
        <Ionicons name="chevron-back-circle" size={36} color={colors.brandSoft} />
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        style={[{ position: 'absolute', right: 12, zIndex: 1 }, rightHintStyle]}
      >
        <Ionicons name="chevron-forward-circle" size={36} color={colors.brandSoft} />
      </Animated.View>

      <GestureDetector gesture={pan}>
        <Animated.View style={cardStyle} className="flex-1 w-full bg-card rounded-3xl shadow-lg overflow-hidden">
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
                <Text className="text-2xl font-bold text-foreground leading-snug mb-3">{flashcard.title}</Text>
              )}
              <Text className="text-base text-foreground leading-relaxed">{flashcard.content}</Text>
            </ScrollView>
          </View>

          <View className="items-center pb-6 gap-1">
            <Ionicons name="swap-horizontal" size={20} color={colors.brandSoft} />
            <Text className="text-sm text-muted-foreground">Arraste para o lado para continuar</Text>
          </View>
        </Animated.View>
      </GestureDetector>

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
                {flashcard.sourceChunks.map((chunk, index) => (
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
