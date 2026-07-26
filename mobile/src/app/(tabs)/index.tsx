import { useState, useCallback } from 'react';
import { ActivityIndicator, View } from 'react-native';
// Trocamos useEffect por useFocusEffect do Expo Router
import { useRouter, useFocusEffect } from 'expo-router';
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';

import { Screen } from '@/components/common/Screen';
import { AnimatedHeader } from '@/components/common/AnimatedHeader';
import { HeaderAction } from '@/components/common/HeaderAction';
import { SchedulerCard } from '@/components/scheduler/SchedulerCard';

import { schedulerService } from '@/services/schedulerService';
import { Scheduler } from '@/types/domain/Scheduler'; // Atualizado para a pasta de domínio

export default function Home() {
  const router = useRouter();
  const scrollY = useSharedValue(0);

  const [schedulers, setSchedulers] = useState<Scheduler[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // useFocusEffect + useCallback garante que a tela recarregue
  // sempre que o usuário voltar da tela de "Criar Alarme"
  useFocusEffect(
    useCallback(() => {
      async function loadData() {
        try {
          const data = await schedulerService.getAll();
          setSchedulers(data);
        } catch (error) {
          console.error('Erro ao buscar schedulers:', error);
        } finally {
          setIsLoading(false);
        }
      }

      loadData();
    }, []),
  );

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  function handleCreateScheduler() {
    router.push('/(scheduler)/create');
  }

  async function handleToggle(id: string, enabled: boolean) {
    setSchedulers((prev) =>
      // Atualizado de schedulerId para id
      prev.map((item) => (item.id === id ? { ...item, enabled } : item)),
    );

    try {
      await schedulerService.toggleStatus(id, enabled);
    } catch (error) {
      console.error('Falha ao atualizar', error);
      setSchedulers((prev) =>
        // Atualizado de schedulerId para id
        prev.map((item) => (item.id === id ? { ...item, enabled: !enabled } : item)),
      );
    }
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

      {isLoading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#FFFFFF" />
        </View>
      ) : (
        <Animated.FlatList
          data={schedulers}
          // Atualizado de schedulerId para id
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
                  // Atualizado de schedulerId para id
                  params: { id: item.id },
                })
              }
              // Atualizado de schedulerId para id
              onToggle={(enabled) => handleToggle(item.id, enabled)}
            />
          )}
        />
      )}
    </Screen>
  );
}
