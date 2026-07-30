import { useRouter } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';

import { Screen } from '@/components/common/Screen';
import { AnimatedHeader } from '@/components/common/AnimatedHeader';
import { HeaderAction } from '@/components/common/HeaderAction';
import { ErrorState } from '@/components/common/ErrorState';
import { ObjectCard } from '@/components/object/ObjectCard';

import { useObjectsQuery } from '@/hooks/useObjects';

export default function ObjectsScreen() {
  const router = useRouter();
  const scrollY = useSharedValue(0);

  const { data: objects = [], isPending, isError, error, refetch } = useObjectsQuery();

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  function handleCreateObject() {
    router.push('/(object)/create');
  }

  return (
    <Screen edges={['top', 'left', 'right']}>
      <AnimatedHeader
        title="Objetos"
        showBackButton={false}
        scrollY={scrollY}
        floatingIcon="add"
        onFloatingPress={handleCreateObject}
        rightAction={<HeaderAction icon="add" onPress={handleCreateObject} />}
      />

      {isPending ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#FFFFFF" />
        </View>
      ) : isError ? (
        <ErrorState message={error?.message} onRetry={() => refetch()} />
      ) : (
        <Animated.FlatList
          data={objects}
          keyExtractor={(item) => item.id}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          contentContainerClassName="w-full px-4 pt-20 pb-32 gap-2"
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <ObjectCard
              object={item}
              onPress={() => {
                router.push({
                  pathname: '/(object)/[id]',
                  params: { id: item.id },
                });
              }}
            />
          )}
        />
      )}
    </Screen>
  );
}
