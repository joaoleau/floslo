import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';

import { Screen } from '@/components/common/Screen';
import { AnimatedHeader } from '@/components/common/AnimatedHeader';
import { HeaderAction } from '@/components/common/HeaderAction';
import { ObjectCard } from '@/components/object/ObjectCard';

import { objectService } from '@/services/objectService';
// import { ObjectType } from "@/types/Object";

export default function ObjectsScreen() {
  const router = useRouter();
  const scrollY = useSharedValue(0);

  // 1. Estados locais
  const [objects, setObjects] = useState<any[]>([]); // Tipar com sua interface
  const [isLoading, setIsLoading] = useState(true);

  // 2. Chamada ao service no mount do componente
  useEffect(() => {
    async function loadData() {
      try {
        const data = await objectService.getAll();
        setObjects(data);
      } catch (error) {
        console.error('Erro ao carregar objetos:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  function handleCreateObject() {
    router.push('/(object)/create');
  }

  return (
    // Removido "bottom" das edges
    <Screen edges={['top', 'left', 'right']}>
      <AnimatedHeader
        title="Objetos"
        showBackButton={false}
        scrollY={scrollY}
        floatingIcon="add"
        onFloatingPress={handleCreateObject}
        rightAction={<HeaderAction icon="add" onPress={handleCreateObject} />}
      />

      {isLoading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#FFFFFF" />
        </View>
      ) : (
        <Animated.FlatList
          data={objects}
          keyExtractor={(item) => item.id}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          // Adicionado pb-32 para a lista não ficar escondida atrás da TabBar
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
