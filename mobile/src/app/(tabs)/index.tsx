import { useCallback } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';

import { Screen } from '@/components/common/Screen';
import { AnimatedHeader } from '@/components/common/AnimatedHeader';
import { HeaderAction } from '@/components/common/HeaderAction';
import { ErrorState } from '@/components/common/ErrorState';
import { SchedulerCard } from '@/components/scheduler/SchedulerCard';

import { useSchedulersQuery, useToggleSchedulerMutation } from '@/hooks/useSchedulers';
import { queryKeys } from '@/lib/queryKeys';

export default function Home() {
  const router = useRouter();
  const scrollY = useSharedValue(0);
  const queryClient = useQueryClient();

  const { data: schedulers = [], isPending, isError, error, refetch } = useSchedulersQuery();
  const toggleMutation = useToggleSchedulerMutation();

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

  return (
    <Screen edges={['top', 'left', 'right']}>
      <AnimatedHeader
        title="Alarmes"
        showBackButton={false}
        scrollY={scrollY}
        floatingIcon="add"
        onFloatingPress={handleCreateScheduler}
        rightAction={<HeaderAction icon="add" onPress={handleCreateScheduler} />}
      />

      {isPending ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#FFFFFF" />
        </View>
      ) : isError ? (
        <ErrorState message={error?.message} onRetry={() => refetch()} />
      ) : (
        <Animated.FlatList
          data={schedulers}
          keyExtractor={(item) => item.id}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          contentContainerClassName="w-full px-4 pt-20 pb-32 gap-2"
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <SchedulerCard
              scheduler={item}
              onPress={() =>
                router.push({
                  pathname: '/(scheduler)/[id]',
                  params: { id: item.id },
                })
              }
              onToggle={(enabled) => toggleMutation.mutate({ id: item.id, enabled })}
            />
          )}
        />
      )}
    </Screen>
  );
}
