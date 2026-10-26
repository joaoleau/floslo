import { useRef, useMemo } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/common/Screen';
import { Header } from '@/components/common/Header';
import { HeaderAction } from '@/components/common/HeaderAction';
import { ErrorState } from '@/components/common/ErrorState';

import { SchedulerForm, SchedulerFormRef } from '@/components/scheduler/SchedulerForm';

import { useObjectsQuery } from '@/hooks/useObjects';
import { useCreateSchedulerMutation } from '@/hooks/useSchedulers';
import { Scheduler } from '@/types/domain/Scheduler';
import { useThemeColors } from '@/hooks/useThemeColors';
import { showAlert } from '@/services/alertService';
import { errorMessage } from '@/i18n/errors';

export default function CreateScheduler() {
  const router = useRouter();
  const { t } = useTranslation();
  const colors = useThemeColors();
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
      name: t('schedulers.form.defaultName'),
      language: 'pt',
      weekDays: [],
      startTime: `${hours}:${minutes}`,
      alarmSound: 'chic_pop',
      objectIds: [],
      challengers: [],
      enabled: true,
      vibration: true,
      soundEnabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    // Só o valor inicial: o nome padrão não muda se o idioma for trocado com a tela aberta.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(scheduler: Scheduler) {
    try {
      await createMutation.mutateAsync(scheduler);
      router.back();
    } catch (err) {
      console.error('[CreateScheduler] Falha ao criar o agendador:', err);
      showAlert(t('common.error'), errorMessage(err, 'schedulers.form.createFailed'));
    }
  }

  return (
    <Screen edges={['top', 'left', 'right', 'bottom']}>
      <Header
        title={t('schedulers.form.createTitle')}
        rightAction={
          createMutation.isPending ? (
            <ActivityIndicator color={colors.brand} />
          ) : (
            <HeaderAction icon="checkmark" onPress={() => formRef.current?.submit()} />
          )
        }
      />

      {isPending ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      ) : isError ? (
        <ErrorState message={errorMessage(error, 'objects.loadFailed')} onRetry={() => refetch()} />
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
