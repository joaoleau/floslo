import { useRef } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';

import { Screen } from '@/components/common/Screen';
import { Header } from '@/components/common/Header';
import { HeaderAction } from '@/components/common/HeaderAction';

import { SchedulerForm, SchedulerFormRef } from '@/components/scheduler/SchedulerForm';
import { Text } from '@/components/ui/text';

import { useSchedulerQuery, useUpdateSchedulerMutation, useDeleteSchedulerMutation } from '@/hooks/useSchedulers';
import { useObjectsQuery } from '@/hooks/useObjects';
import { Scheduler } from '@/types/domain/Scheduler';
import { useThemeColors } from '@/hooks/useThemeColors';
import { getColorForId } from '@/lib/hashColor';
import { showAlert } from '@/services/alertService';
import { errorMessage } from '@/i18n/errors';

export default function EditScheduler() {
  const router = useRouter();
  const { t } = useTranslation();
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
      showAlert(t('common.error'), errorMessage(err, 'schedulers.form.saveFailed'));
    }
  }

  function handleDelete(schedulerId: string) {
    showAlert(t('schedulers.form.deleteTitle'), t('schedulers.form.deleteConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteMutation.mutateAsync(schedulerId);
            router.back();
          } catch (err) {
            console.error(`[EditScheduler] Falha ao excluir agendador "${schedulerId}"`, err);
            showAlert(t('common.error'), t('schedulers.form.deleteFailed'));
          }
        },
      },
    ]);
  }

  if (isLoading) {
    return (
      <Screen>
        <Header title={t('schedulers.form.editTitle')} />
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      </Screen>
    );
  }

  if (!scheduler) {
    return (
      <Screen>
        <Header title={t('common.error')} />
        <View className="flex-1 justify-center items-center">
          <Text>{t('errors.api.schedulerNotFound')}</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen edges={['top', 'left', 'right', 'bottom']}>
      <Header
        title={t('schedulers.form.editTitle')}
        rightAction={
          updateMutation.isPending ? (
            <ActivityIndicator color={colors.brand} />
          ) : (
            <HeaderAction icon="checkmark" onPress={() => formRef.current?.submit()} />
          )
        }
      />

      <LinearGradient colors={[getColorForId(scheduler.id), colors.background]} style={{ flex: 1 }}>
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
      </LinearGradient>
    </Screen>
  );
}
