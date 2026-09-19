import React, { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Screen } from '@/components/common/Screen';
import { Header } from '@/components/common/Header';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { CodeInput } from '@/components/common/CodeInput';
import { AuthBackground } from '@/components/auth/AuthBackground';
import { useResetPasswordMutation, useVerifyResetCodeMutation } from '@/hooks/useAuth';
import { showAlert } from '@/services/alertService';

const CODE_LENGTH = 6;

export default function VerifyCodeScreen() {
  const router = useRouter();
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
    } catch (error: any) {
      console.error('[VerifyCode] Código inválido', error);
      showAlert('Código inválido', error.message || 'Código inválido ou expirado. Tente novamente.');
      setCode('');
    }
  }

  async function handleResend() {
    try {
      await resendMutation.mutateAsync(email);
      setCode('');
      showAlert('Código reenviado', 'Enviamos um novo código para o seu e-mail.');
    } catch (error: any) {
      console.error('[VerifyCode] Falha ao reenviar código', error);
      showAlert('Erro', error.message || 'Falha ao reenviar o código');
    }
  }

  return (
    <Screen edges={['top', 'left', 'right', 'bottom']}>
      <Header title="Verificar código" />
      <AuthBackground>
        <View className="p-5">
          <Card className="rounded-3xl p-5 gap-4">
            <Text className="text-muted-foreground">
              Digite o código de {CODE_LENGTH} dígitos enviado para{' '}
              <Text className="font-semibold text-foreground">{email}</Text>.
            </Text>

            <CodeInput length={CODE_LENGTH} value={code} onChangeText={handleChangeCode} editable={!verifyResetCodeMutation.isPending} />

            {verifyResetCodeMutation.isPending && <ActivityIndicator />}

            <Pressable onPress={handleResend} disabled={resendMutation.isPending} className="items-center py-2">
              <Text className="text-sm font-medium text-[#3B82F6]">Não recebeu? Reenviar código</Text>
            </Pressable>
          </Card>
        </View>
      </AuthBackground>
    </Screen>
  );
}
