import React, { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/common/Screen';
import { Header } from '@/components/common/Header';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { CodeInput } from '@/components/common/CodeInput';
import { AuthBackground } from '@/components/auth/AuthBackground';
import { useResetPasswordMutation, useVerifyResetCodeMutation } from '@/hooks/useAuth';
import { showAlert } from '@/services/alertService';
import { errorMessage } from '@/i18n/errors';

const CODE_LENGTH = 6;

export default function VerifyCodeScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { email } = useLocalSearchParams<{ email: string }>();
  const [code, setCode] = useState('');
  const verifyResetCodeMutation = useVerifyResetCodeMutation();
  const resendMutation = useResetPasswordMutation();

  async function handleChangeCode(value: string) {
    setCode(value);
    if (value.length !== CODE_LENGTH || verifyResetCodeMutation.isPending) return;

    try {
      await verifyResetCodeMutation.mutateAsync({ email, code: value });
      router.push({ pathname: '/(auth)/new-password', params: { email, code: value } });
    } catch (error) {
      console.error('[VerifyCode] Código inválido', error);
      showAlert(t('auth.verify.invalidTitle'), errorMessage(error, 'auth.verify.invalid'));
      setCode('');
    }
  }

  async function handleResend() {
    try {
      await resendMutation.mutateAsync(email);
      setCode('');
      showAlert(t('auth.verify.resentTitle'), t('auth.verify.resent'));
    } catch (error) {
      console.error('[VerifyCode] Falha ao reenviar código', error);
      showAlert(t('common.error'), errorMessage(error, 'auth.verify.resendFailed'));
    }
  }

  return (
    <Screen edges={['top', 'left', 'right', 'bottom']}>
      <Header title={t('auth.verify.title')} />
      <AuthBackground>
        <View className="p-5">
          <Card className="rounded-3xl p-5 gap-4">
            <Text className="text-muted-foreground">
              {t('auth.verify.instructionsBefore', { length: CODE_LENGTH })}
              <Text className="font-semibold text-foreground">{email}</Text>
              {t('auth.verify.instructionsAfter')}
            </Text>

            <CodeInput length={CODE_LENGTH} value={code} onChangeText={handleChangeCode} editable={!verifyResetCodeMutation.isPending} />

            {verifyResetCodeMutation.isPending && <ActivityIndicator />}

            <Pressable onPress={handleResend} disabled={resendMutation.isPending} className="items-center py-2">
              <Text className="text-sm font-medium text-[#3B82F6]">{t('auth.verify.resend')}</Text>
            </Pressable>
          </Card>
        </View>
      </AuthBackground>
    </Screen>
  );
}
