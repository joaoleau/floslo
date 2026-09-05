import { useRef } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Screen } from '@/components/common/Screen';
import { Header } from '@/components/common/Header';
import { HeaderAction } from '@/components/common/HeaderAction';

import { SchedulerForm, SchedulerFormRef } from '@/components/scheduler/SchedulerForm';
import { Text } from '@/components/ui/text';

import { useSchedulerQuery, useUpdateSchedulerMutation, useDeleteSchedulerMutation } from '@/hooks/useSchedulers';
import { useObjectsQuery } from '@/hooks/useObjects';
import { Scheduler } from '@/types/domain/Scheduler';
import { useThemeColors } from '@/hooks/useThemeColors';

export default function EditScheduler() {
  const router = useRouter();
  const colors = useThemeColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const formRef = useRef<SchedulerFormRef>(null);

  const { data: scheduler, isPending: isSchedulerPending } = useSchedulerQuery(id);
  const { data: availableObjects = [], isPending: isObjectsPending } = useObjectsQuery();
  const updateMutation = useUpdateSchedulerMutation();
  const deleteMutation = useDeleteSchedulerMutation();

  const isLoading = isSchedulerPending || isObjectsPending;

  async function handleSubmit(updatedScheduler: Scheduler) {
    try {
      await updateMutation.mutateAsync({ id, scheduler: updatedScheduler });
      router.back();
    } catch (err) {
      console.error(`[EditScheduler] Falha ao salvar agendador "${id}"`, err);
      Alert.alert('Erro', 'Falha ao salvar as alterações.');
    }
  }

  function handleDelete(schedulerId: string) {
    Alert.alert('Excluir Agendador', 'Tem certeza que deseja excluir este agendador?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteMutation.mutateAsync(schedulerId);
            router.back();
          } catch (err) {
            console.error(`[EditScheduler] Falha ao excluir agendador "${schedulerId}"`, err);
            Alert.alert('Erro', 'Falha ao excluir.');
          }
        },
      },
    ]);
  }

  if (isLoading) {
    return (
      <Screen>
        <Header title="Editar Agendador" />
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      </Screen>
    );
  }

  if (!scheduler) {
    return (
      <Screen>
        <Header title="Erro" />
        <View className="flex-1 justify-center items-center">
          <Text>Agendador não encontrado.</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen edges={['top', 'left', 'right', 'bottom']}>
      <Header
        title="Editar Agendador"
        rightAction={
          updateMutation.isPending ? (
            <ActivityIndicator color={colors.brand} />
          ) : (
            <HeaderAction icon="checkmark" onPress={() => formRef.current?.submit()} />
          )
        }
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          <SchedulerForm
            ref={formRef}
            initialValues={scheduler}
            availableObjects={availableObjects}
            onSubmit={handleSubmit}
            onDelete={handleDelete}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
