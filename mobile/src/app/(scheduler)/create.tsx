import { useRef, useMemo } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Screen } from '@/components/common/Screen';
import { Header } from '@/components/common/Header';
import { HeaderAction } from '@/components/common/HeaderAction';
import { ErrorState } from '@/components/common/ErrorState';

import { SchedulerForm, SchedulerFormRef } from '@/components/scheduler/SchedulerForm';

import { useObjectsQuery } from '@/hooks/useObjects';
import { useCreateSchedulerMutation } from '@/hooks/useSchedulers';
import { Scheduler } from '@/types/domain/Scheduler';

export default function CreateScheduler() {
  const router = useRouter();
  const formRef = useRef<SchedulerFormRef>(null);

  const { data: availableObjects = [], isPending, isError, error, refetch } = useObjectsQuery();
  const createMutation = useCreateSchedulerMutation();

  // Calcula a hora inicial (atual) e monta o objeto base do alarme
  const initialScheduler = useMemo<Scheduler>(() => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');

    return {
      id: '',
      name: '',
      weekDays: [],
      startTime: `${hours}:${minutes}`,
      alarmSound: '',
      objectIds: [],
      challengers: [],
      enabled: true,
      vibration: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }, []);

  async function handleSubmit(scheduler: Scheduler) {
    try {
      await createMutation.mutateAsync(scheduler);
      router.back();
    } catch (err) {
      console.error('[CreateScheduler] Falha ao criar o alarme:', err);
      Alert.alert('Erro', err instanceof Error ? err.message : 'Falha ao criar o alarme.');
    }
  }

  return (
    <Screen edges={['top', 'left', 'right', 'bottom']}>
      <Header
        title="Novo Alarme"
        rightAction={
          createMutation.isPending ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <HeaderAction icon="checkmark" onPress={() => formRef.current?.submit()} />
          )
        }
      />

      {isPending ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#FFFFFF" />
        </View>
      ) : isError ? (
        <ErrorState message={error?.message} onRetry={() => refetch()} />
      ) : (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
            <SchedulerForm
              ref={formRef}
              initialValues={initialScheduler}
              availableObjects={availableObjects}
              onSubmit={handleSubmit}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </Screen>
  );
}
