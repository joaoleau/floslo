import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

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

export default function NewPasswordScreen() {
  const router = useRouter();
  const { email, code } = useLocalSearchParams<{ email: string; code: string }>();
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const confirmResetMutation = useConfirmPasswordResetMutation();

  async function handleConfirmReset() {
    if (!newPassword || !confirmNewPassword) {
      showAlert('Atenção', 'Preencha a nova senha e a confirmação.');
      return;
    }
    if (!isPasswordValid(newPassword)) {
      showAlert('Senha fraca', 'Sua nova senha precisa atender aos requisitos listados abaixo do campo.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      showAlert('Atenção', 'A confirmação não é igual à nova senha.');
      return;
    }

    try {
      await confirmResetMutation.mutateAsync({ email, code, newPassword });
      showAlert('Sucesso', 'Sua senha foi alterada.', [
        { text: 'OK', onPress: () => router.replace('/(auth)/login') },
      ]);
    } catch (error: any) {
      console.error('[NewPassword] Falha ao confirmar troca de senha', error);
      showAlert('Erro', error.message || 'Código inválido ou expirado.');
    }
  }

  return (
    <Screen edges={['top', 'left', 'right', 'bottom']}>
      <Header title="Nova senha" />
      <AuthBackground>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
          <View className="p-5">
            <Card className="rounded-3xl p-5 gap-3">
              <Text className="text-muted-foreground">Escolha uma nova senha para sua conta.</Text>

              <Input placeholder="Nova senha" value={newPassword} onChangeText={setNewPassword} secureTextEntry />

              <Input
                placeholder="Confirmar nova senha"
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
                  <Text className="font-semibold text-white">Trocar senha</Text>
                )}
              </Button>
            </Card>
          </View>
        </KeyboardAvoidingView>
      </AuthBackground>
    </Screen>
  );
}
