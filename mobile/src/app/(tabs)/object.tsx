import { useCallback, useState } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';

import { Screen } from '@/components/common/Screen';
import { AnimatedHeader } from '@/components/common/AnimatedHeader';
import { HeaderAction } from '@/components/common/HeaderAction';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { ObjectCard } from '@/components/object/ObjectCard';

import { useObjectsQuery, useDeleteObjectMutation } from '@/hooks/useObjects';
import { queryKeys } from '@/lib/queryKeys';
import { useThemeColors } from '@/hooks/useThemeColors';
import { showAlert } from '@/services/alertService';
import { errorMessage } from '@/i18n/errors';

export default function ObjectsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const colors = useThemeColors();
  const scrollY = useSharedValue(0);
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const selectionMode = selectedIds.size > 0;

  const { data: objects = [], isPending, isError, error, refetch } = useObjectsQuery();
  const deleteMutation = useDeleteObjectMutation();

  useFocusEffect(
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: queryKeys.objects.all });
    }, [queryClient])
  );

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  function handleCreateObject() {
    router.push('/(object)/create');
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  function handleCardPress(id: string) {
    if (selectionMode) {
      toggleSelected(id);
    } else {
      router.push({ pathname: '/(object)/[id]', params: { id } });
    }
  }

  function handleDeleteSelected() {
    const count = selectedIds.size;
    showAlert(
      t('objects.deleteSelected.title'),
      t('objects.deleteSelected.confirm', { count }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            const ids = Array.from(selectedIds);
            clearSelection();
            await Promise.all(ids.map((id) => deleteMutation.mutateAsync(id)));
          },
        },
      ]
    );
  }

  return (
    <Screen edges={['top', 'left', 'right']}>
      <AnimatedHeader
        title={selectionMode ? t('common.selected', { count: selectedIds.size }) : t('objects.title')}
        showBackButton={selectionMode}
        onBack={clearSelection}
        scrollY={scrollY}
        floatingIcon={selectionMode ? 'trash-outline' : 'add'}
        onFloatingPress={selectionMode ? handleDeleteSelected : handleCreateObject}
        rightAction={
          selectionMode ? (
            <HeaderAction icon="trash-outline" color={colors.destructive} onPress={handleDeleteSelected} />
          ) : (
            <HeaderAction icon="add" onPress={handleCreateObject} />
          )
        }
      />

      {isPending ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      ) : isError ? (
        <ErrorState message={errorMessage(error, 'objects.loadFailed')} onRetry={() => refetch()} />
      ) : objects.length === 0 ? (
        <View className="flex-1 pt-[72px] px-4">
          <EmptyState
            icon="document-text-outline"
            title={t('objects.empty.title')}
            description={t('objects.empty.description')}
            actionLabel={t('objects.empty.action')}
            onAction={handleCreateObject}
            color="#3B82F6"
          />
        </View>
      ) : (
        <Animated.FlatList
          data={objects}
          keyExtractor={(item) => item.id}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          contentContainerClassName="w-full px-4 pt-[72px] pb-32 gap-2"
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <ObjectCard
              object={item}
              selectionMode={selectionMode}
              selected={selectedIds.has(item.id)}
              onPress={() => handleCardPress(item.id)}
              onLongPress={() => toggleSelected(item.id)}
            />
          )}
        />
      )}
    </Screen>
  );
}
