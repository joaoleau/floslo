import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Screen } from '@/components/common/Screen';
import { Header } from '@/components/common/Header';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AuthBackground } from '@/components/auth/AuthBackground';
import { useResetPasswordMutation } from '@/hooks/useAuth';
import { showAlert } from '@/services/alertService';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const resetPasswordMutation = useResetPasswordMutation();

  async function handleSendCode() {
    if (!email) {
      showAlert('Atenção', 'Preencha o e-mail cadastrado.');
      return;
    }

    try {
      await resetPasswordMutation.mutateAsync(email);
      router.push({ pathname: '/(auth)/verify-code', params: { email } });
    } catch (error: any) {
      console.error('[ForgotPassword] Falha ao enviar e-mail de recuperação', error);
      showAlert('Erro', error.message || 'Falha ao enviar e-mail');
    }
  }

  return (
    <Screen edges={['top', 'left', 'right', 'bottom']}>
      <Header title="Recuperar senha" />
      <AuthBackground>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
          <View className="p-5">
            <Card className="rounded-3xl p-5 gap-3">
              <Text className="text-muted-foreground">Digite seu e-mail para receber um código de recuperação.</Text>

              <Input placeholder="E-mail" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />

              <Button
                onPress={handleSendCode}
                disabled={resetPasswordMutation.isPending}
                className="mt-1 rounded-3xl bg-brand-100"
              >
                {resetPasswordMutation.isPending ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="font-semibold text-white">Enviar código</Text>
                )}
              </Button>
            </Card>
          </View>
        </KeyboardAvoidingView>
      </AuthBackground>
    </Screen>
  );
}
