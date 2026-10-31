import React, { useState } from 'react';
import { View, Pressable, ScrollView } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/text';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Discovery } from '@/types/domain/RAG';
import { useThemeColors } from '@/hooks/useThemeColors';
import { SourceChunksSheet } from '@/components/challenges/SourceChunksSheet';
import { ChallengeResult } from '@/types/domain/History';

interface DiscoveryChallengeProps {
  discovery: Discovery;
  currentIndex: number;
  totalDiscoveries: number;
  onSuccess: (result: ChallengeResult) => void;
}

export function DiscoveryChallenge({ discovery, currentIndex, totalDiscoveries, onSuccess }: DiscoveryChallengeProps) {
  const colors = useThemeColors();
  const { t } = useTranslation();
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
              {discovery.tag}
            </Text>
            {discovery.sourceChunks.length > 0 && (
              <Pressable hitSlop={8} onPress={() => setShowSources(true)}>
                <Ionicons name="help-circle-outline" size={20} color={colors.brandSoft} />
              </Pressable>
            )}
          </View>
          <Text className="text-sm font-bold text-foreground" style={{ flexShrink: 0 }}>
            {currentIndex + 1} / {totalDiscoveries}
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
            {!!discovery.title && (
              <Text className="text-center text-2xl font-bold text-foreground leading-snug mb-3">{discovery.title}</Text>
            )}
            <Text className="text-center text-base text-foreground leading-relaxed">{discovery.content}</Text>
            <Text className="mt-4 text-center text-xs text-muted-foreground">{t('terms.aiNotice')}</Text>
          </ScrollView>
        </View>

        <View className="p-4 pt-0">
          <Button onPress={handleContinue} className="bg-brand-100 rounded-3xl h-12 flex-row items-center justify-center">
            <Text className="text-white font-bold text-lg">{t('challenges.continue')}</Text>
            <Ionicons name="arrow-forward" size={20} color="white" style={{ marginLeft: 8 }} />
          </Button>
        </View>
      </Animated.View>

      <SourceChunksSheet visible={showSources} chunks={discovery.sourceChunks} onClose={() => setShowSources(false)} />
    </View>
  );
}
