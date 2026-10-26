import { useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { useTranslation } from 'react-i18next';
import { SourceChunk } from '@/types/domain/RAG';
import { useThemeColors } from '@/hooks/useThemeColors';

// Quantas linhas um trecho mostra antes de ser aberto, e a partir de quantos caracteres ele
// provavelmente passa disso (os chunks têm cerca de 2.000 caracteres).
const COLLAPSED_LINES = 5;
const LONG_CHUNK_CHARS = 280;

interface SourceChunksSheetProps {
  visible: boolean;
  chunks: SourceChunk[];
  onClose: () => void;
}

/**
 * De onde o desafio veio: os chunks do material que o embasaram, com o documento, a página e a
 * posição de cada um. O primeiro é o chunk principal, de onde o desafio saiu; o seguinte, se
 * houver, é o vizinho que serviu de apoio. Cada trecho aparece recolhido e abre por completo ao
 * ser tocado.
 */
export function SourceChunksSheet({ visible, chunks, onClose }: SourceChunksSheetProps) {
  const colors = useThemeColors();
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  function toggle(index: number) {
    setExpanded((current) => ({ ...current, [index]: !current[index] }));
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/40">
        <Card className="max-h-[75%] rounded-t-3xl p-5 gap-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-lg font-semibold text-foreground">{t('challenges.sources.title')}</Text>
            <Pressable hitSlop={8} onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.brand} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View className="gap-3 pb-4">
              {chunks.map((chunk, index) => {
                const isExpanded = !!expanded[index];
                const isLong = chunk.content.length > LONG_CHUNK_CHARS;

                return (
                  <Pressable
                    key={`${chunk.objectKey}-${chunk.chunkIndex}-${index}`}
                    testID={`source-chunk-${index}`}
                    onPress={() => toggle(index)}
                    disabled={!isLong}
                    className="rounded-xl border border-border bg-muted p-3 gap-2"
                  >
                    <View className="flex-row items-center gap-1.5 min-w-0">
                      <Ionicons name="document-text-outline" size={14} color={colors.brandSoft} />
                      <Text className="text-xs font-medium text-foreground flex-shrink overflow-hidden" numberOfLines={1}>
                        {chunk.objectKey}
                      </Text>
                    </View>

                    <Text className="text-xs text-muted-foreground">
                      {t(index === 0 ? 'challenges.sources.main' : 'challenges.sources.support')} •{' '}
                      {t('challenges.sources.page', { page: chunk.page })} •{' '}
                      {t('challenges.sources.chunk', { number: chunk.chunkIndex + 1 })}
                    </Text>

                    <Text
                      className="text-sm text-foreground leading-relaxed"
                      numberOfLines={isExpanded ? undefined : COLLAPSED_LINES}
                    >
                      {chunk.content}
                    </Text>

                    {isLong && (
                      <View className="flex-row items-center gap-1">
                        <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={14} color={colors.brandSoft} />
                        <Text className="text-xs font-medium text-muted-foreground">
                          {isExpanded ? t('challenges.sources.collapse') : t('challenges.sources.expand')}
                        </Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        </Card>
      </View>
    </Modal>
  );
}
