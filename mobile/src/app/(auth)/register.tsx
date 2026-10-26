import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from '@/components/common/Screen';
import { Header } from '@/components/common/Header';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordRequirements } from '@/components/common/PasswordRequirements';
import { AuthBackground } from '@/components/auth/AuthBackground';
import { AuthLoadingScreen } from '@/components/auth/AuthLoadingScreen';
import { useRegisterMutation } from '@/hooks/useAuth';
import { useThemeColors } from '@/hooks/useThemeColors';
import { isPasswordValid } from '@/lib/passwordPolicy';
import { showAlert } from '@/services/alertService';
import { sessionService } from '@/services/sessionService';

export default function RegisterScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const registerMutation = useRegisterMutation();

  async function handleRegister() {
    if (!email || !username || !password) {
      showAlert('Atenção', 'Preencha todos os campos.');
      return;
    }
    if (!isPasswordValid(password)) {
      showAlert('Senha fraca', 'Sua senha precisa atender aos requisitos listados abaixo do campo.');
      return;
    }

    try {
      await registerMutation.mutateAsync({ email, username, password });
      router.replace(await sessionService.start());
    } catch (error: any) {
      console.error('[Register] Falha ao criar conta', error);
      showAlert('Erro', error.message || 'Falha ao criar conta');
    }
  }

  if (registerMutation.isPending) {
    return (
      <Screen edges={['top', 'left', 'right', 'bottom']}>
        <AuthLoadingScreen />
      </Screen>
    );
  }

  return (
    <Screen edges={['top', 'left', 'right', 'bottom']}>
      <Header title="Criar conta" />
      <AuthBackground>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
            <Card className="rounded-3xl p-5 gap-3">
              <Input placeholder="E-mail" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />

              <Input placeholder="Nome de usuário" value={username} onChangeText={setUsername} autoCapitalize="none" />

              <View className="flex-row items-center">
                <Input
                  placeholder="Senha"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  className="flex-1 pr-10"
                />
                <Pressable hitSlop={10} onPress={() => setShowPassword((prev) => !prev)} className="absolute right-3">
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.mutedForeground} />
                </Pressable>
              </View>

              {password.length > 0 && (
                <View className="rounded-xl bg-secondary p-3">
                  <PasswordRequirements password={password} />
                </View>
              )}

              <Button onPress={handleRegister} className="mt-1 rounded-3xl bg-brand-100">
                <Text className="font-semibold text-white">Cadastrar</Text>
              </Button>
            </Card>
          </ScrollView>
        </KeyboardAvoidingView>
      </AuthBackground>
    </Screen>
  );
}
