import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Screen } from '@/components/common/Screen';
import { Header } from '@/components/common/Header';
import { HeaderAction } from '@/components/common/HeaderAction';

import { SchedulerForm, SchedulerFormRef } from '@/components/scheduler/SchedulerForm';
import { Text } from '@/components/ui/text';

import { schedulerService } from '@/services/schedulerService';
import { objectService } from '@/services/objectService';
import { Scheduler } from '@/types/domain/Scheduler';
import { ObjectType } from '@/types/domain/Object';

export default function EditScheduler() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const formRef = useRef<SchedulerFormRef>(null);

  // Estados
  const [scheduler, setScheduler] = useState<Scheduler | null>(null);
  const [availableObjects, setAvailableObjects] = useState<ObjectType[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Busca dados em paralelo
  useEffect(() => {
    async function loadData() {
      try {
        const [schedulerData, objectsData] = await Promise.all([
          schedulerService.getById(id),
          objectService.getAll(),
        ]);

        if (schedulerData) setScheduler(schedulerData);
        setAvailableObjects(objectsData);
      } catch (error) {
        Alert.alert('Erro', 'Não foi possível carregar os dados.');
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [id]);

  async function handleSubmit(updatedScheduler: Scheduler) {
    setIsSaving(true);
    try {
      await schedulerService.update(id, updatedScheduler);
      router.back();
    } catch (error) {
      Alert.alert('Erro', 'Falha ao salvar as alterações.');
      setIsSaving(false);
    }
  }

  async function handleDelete(schedulerId: string) {
    Alert.alert('Excluir Alarme', 'Tem certeza que deseja excluir este alarme?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            await schedulerService.deleteScheduler(schedulerId);
            router.back();
          } catch (error) {
            Alert.alert('Erro', 'Falha ao excluir.');
          }
        },
      },
    ]);
  }

  if (isLoading) {
    return (
      <Screen>
        <Header title="Editar Alarme" />
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#FFFFFF" />
        </View>
      </Screen>
    );
  }

  if (!scheduler) {
    return (
      <Screen>
        <Header title="Erro" />
        <View className="flex-1 justify-center items-center">
          <Text>Alarme não encontrado.</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen edges={['top', 'left', 'right', 'bottom']}>
      <Header
        title="Editar Alarme"
        rightAction={
          isSaving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <HeaderAction icon="checkmark" onPress={() => formRef.current?.submit()} />
          )
        }
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          <SchedulerForm
            ref={formRef}
            initialValues={scheduler}
            availableObjects={availableObjects} // Prop nova passada com sucesso!
            onSubmit={handleSubmit}
            onDelete={handleDelete}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
