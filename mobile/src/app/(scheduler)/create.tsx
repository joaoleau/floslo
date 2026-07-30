import { useEffect, useRef, useState, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

import { Screen } from '@/components/common/Screen';
import { Header } from '@/components/common/Header';
import { HeaderAction } from '@/components/common/HeaderAction';

import { SchedulerForm, SchedulerFormRef } from '@/components/scheduler/SchedulerForm';

import { objectService } from '@/services/objectService';
import { schedulerService } from '@/services/schedulerService';
import { Scheduler } from '@/types/domain/Scheduler';
import { ObjectType } from '@/types/domain/Object';

export default function CreateScheduler() {
  const router = useRouter();
  const formRef = useRef<SchedulerFormRef>(null);

  const [availableObjects, setAvailableObjects] = useState<ObjectType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

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
      alarmSound: { name: '' },
      objectIds: [],
      challengers: [],
      enabled: true,
      vibration: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }, []);

  // Busca apenas a lista de objetos para o form
  useEffect(() => {
    async function fetchObjects() {
      try {
        const objectsData = await objectService.getAll();
        setAvailableObjects(objectsData);
      } catch (error) {
        Alert.alert('Erro', 'Não foi possível carregar os objetos disponíveis.');
      } finally {
        setIsLoading(false);
      }
    }
    fetchObjects();
  }, []);

  async function handleSubmit(scheduler: Scheduler) {
    setIsSaving(true);
    try {
      const payload = {
        ...scheduler,
        id: scheduler.id || `sch_${Date.now()}`,
      };
      
      await schedulerService.create(payload);
      router.back();
    } catch (error) {
      console.error(error);
      Alert.alert('Erro', 'Falha ao criar o alarme.');
      setIsSaving(false);
    }
  }

  return (
    <Screen edges={['top', 'left', 'right', 'bottom']}>
      <Header
        title="Novo Alarme"
        rightAction={
          isSaving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <HeaderAction icon="checkmark" onPress={() => formRef.current?.submit()} />
          )
        }
      />

      {isLoading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#FFFFFF" />
        </View>
      ) : (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1"
        >
          {/* ScrollView garante que listas grandes e teclados não quebrem a tela */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 40 }}
          >
            <SchedulerForm
              ref={formRef}
              initialValues={initialScheduler} // <-- Passando o valor inicial aqui
              availableObjects={availableObjects}
              onSubmit={handleSubmit}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </Screen>
  );
}