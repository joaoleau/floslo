import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/common/Screen';
import { Header } from '@/components/common/Header';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordRequirements } from '@/components/common/PasswordRequirements';
import { AuthBackground } from '@/components/auth/AuthBackground';
import { useConfirmPasswordResetMutation } from '@/hooks/useAuth';
import { isPasswordValid } from '@/lib/passwordPolicy';
import { showAlert } from '@/services/alertService';
import { errorMessage } from '@/i18n/errors';

export default function NewPasswordScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { email, code } = useLocalSearchParams<{ email: string; code: string }>();
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const confirmResetMutation = useConfirmPasswordResetMutation();

  async function handleConfirmReset() {
    if (!newPassword || !confirmNewPassword) {
      showAlert(t('common.attention'), t('auth.newPassword.fieldsRequired'));
      return;
    }
    if (!isPasswordValid(newPassword)) {
      showAlert(t('auth.weakPassword.title'), t('auth.weakPassword.newMessage'));
      return;
    }
    if (newPassword !== confirmNewPassword) {
      showAlert(t('common.attention'), t('auth.newPassword.mismatch'));
      return;
    }

    try {
      await confirmResetMutation.mutateAsync({ email, code, newPassword });
      showAlert(t('common.success'), t('auth.newPassword.changed'), [
        { text: t('common.ok'), onPress: () => router.replace('/(auth)/login') },
      ]);
    } catch (error) {
      console.error('[NewPassword] Falha ao confirmar troca de senha', error);
      showAlert(t('common.error'), errorMessage(error, 'errors.api.invalidCode'));
    }
  }

  return (
    <Screen edges={['top', 'left', 'right', 'bottom']}>
      <Header title={t('auth.newPassword.title')} />
      <AuthBackground>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
          <View className="p-5">
            <Card className="rounded-3xl p-5 gap-3">
              <Text className="text-muted-foreground">{t('auth.newPassword.instructions')}</Text>

              <Input placeholder={t('auth.newPassword.newPassword')} value={newPassword} onChangeText={setNewPassword} secureTextEntry />

              <Input
                placeholder={t('auth.newPassword.confirm')}
                value={confirmNewPassword}
                onChangeText={setConfirmNewPassword}
                secureTextEntry
              />

              {newPassword.length > 0 && (
                <View className="rounded-xl bg-secondary p-3">
                  <PasswordRequirements password={newPassword} />
                </View>
              )}

              <Button
                onPress={handleConfirmReset}
                disabled={confirmResetMutation.isPending}
                className="mt-1 rounded-3xl bg-brand-100"
              >
                {confirmResetMutation.isPending ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="font-semibold text-white">{t('auth.newPassword.submit')}</Text>
                )}
              </Button>
            </Card>
          </View>
        </KeyboardAvoidingView>
      </AuthBackground>
    </Screen>
  );
}
