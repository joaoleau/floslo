import { useCallback, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';

import { Screen } from '@/components/common/Screen';
import { AnimatedHeader } from '@/components/common/AnimatedHeader';
import { HeaderAction } from '@/components/common/HeaderAction';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { AlarmPermissionBanner } from '@/components/common/AlarmPermissionBanner';
import { Text } from '@/components/ui/text';
import { SchedulerCard } from '@/components/scheduler/SchedulerCard';
import {
  SchedulerListFilters,
  matchesSchedulerFilter,
  type SchedulerFilter,
} from '@/components/scheduler/SchedulerListFilters';

import {
  useSchedulersQuery,
  useToggleSchedulerMutation,
  useDeleteSchedulerMutation,
} from '@/hooks/useSchedulers';
import { queryKeys } from '@/lib/queryKeys';
import { useThemeColors } from '@/hooks/useThemeColors';
import { showAlert } from '@/services/alertService';
import { errorMessage } from '@/i18n/errors';

export default function Home() {
  const router = useRouter();
  const { t } = useTranslation();
  const colors = useThemeColors();
  const scrollY = useSharedValue(0);
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<SchedulerFilter>('all');
  const selectionMode = selectedIds.size > 0;

  const { data: schedulers = [], isPending, isError, error, refetch } = useSchedulersQuery();
  const toggleMutation = useToggleSchedulerMutation();
  const deleteMutation = useDeleteSchedulerMutation();

  const visibleSchedulers = schedulers.filter((scheduler) => matchesSchedulerFilter(scheduler, filter));

  // Elemento (não componente) de propósito: um componente declarado aqui dentro seria
  // recriado a cada render de Home e remontaria a AlarmPermissionBanner sem necessidade.
  const listHeader = (
    <View className="gap-4">
      <AlarmPermissionBanner />
      <SchedulerListFilters value={filter} onChange={setFilter} schedulers={schedulers} />
    </View>
  );

  // Force a refresh whenever we come back from create/edit, matching the
  // previous useFocusEffect-based refetch behavior.
  useFocusEffect(
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: queryKeys.schedulers.all });
    }, [queryClient])
  );

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  function handleCreateScheduler() {
    router.push('/(scheduler)/create');
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
      router.push({ pathname: '/(scheduler)/[id]', params: { id } });
    }
  }

  function handleDeleteSelected() {
    const count = selectedIds.size;
    showAlert(
      t('schedulers.deleteSelected.title'),
      t('schedulers.deleteSelected.confirm', { count }),
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
        title={selectionMode ? t('common.selected', { count: selectedIds.size }) : t('schedulers.title')}
        showBackButton={selectionMode}
        onBack={clearSelection}
        scrollY={scrollY}
        floatingIcon={selectionMode ? 'trash-outline' : 'add'}
        onFloatingPress={selectionMode ? handleDeleteSelected : handleCreateScheduler}
        rightAction={
          selectionMode ? (
            <HeaderAction icon="trash-outline" color={colors.destructive} onPress={handleDeleteSelected} />
          ) : (
            <HeaderAction icon="add" onPress={handleCreateScheduler} />
          )
        }
      />

      {isPending ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      ) : isError ? (
        <ErrorState message={errorMessage(error, 'schedulers.loadFailed')} onRetry={() => refetch()} />
      ) : schedulers.length === 0 ? (
        <View className="flex-1 pt-[72px] px-4 gap-4">
          <AlarmPermissionBanner />
          <EmptyState
            icon="alarm-outline"
            title={t('schedulers.empty.title')}
            description={t('schedulers.empty.description')}
            actionLabel={t('schedulers.empty.action')}
            onAction={handleCreateScheduler}
            color="#F59E0B"
          />
        </View>
      ) : (
        <Animated.FlatList
          data={visibleSchedulers}
          keyExtractor={(item) => item.id}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={
            <Text className="pt-6 text-center text-muted-foreground">{t('schedulers.emptyFilter')}</Text>
          }
          contentContainerClassName="w-full px-4 pt-[72px] pb-32 gap-4"
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <SchedulerCard
              scheduler={item}
              selectionMode={selectionMode}
              selected={selectedIds.has(item.id)}
              onPress={() => handleCardPress(item.id)}
              onLongPress={() => toggleSelected(item.id)}
              onToggle={(enabled) => toggleMutation.mutate({ id: item.id, enabled })}
            />
          )}
        />
      )}
    </Screen>
  );
}
