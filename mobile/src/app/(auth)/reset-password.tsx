import React, { useState } from 'react';
import { View, Pressable, ActivityIndicator, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Text } from '@/components/ui/text';
import { Input } from '@/components/ui/input';
import { useResetPasswordMutation } from '@/hooks/useAuth';
import { useThemeColors } from '@/hooks/useThemeColors';
import { HEX } from '@/lib/theme-tokens';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const [email, setEmail] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const resetPasswordMutation = useResetPasswordMutation();

  async function handleReset() {
    if (!email) {
      Alert.alert('Atenção', 'Preencha o e-mail cadastrado.');
      return;
    }

    try {
      await resetPasswordMutation.mutateAsync(email);
      setIsSuccess(true);
    } catch (error: any) {
      console.error('[ResetPassword] Falha ao enviar e-mail de recuperação', error);
      Alert.alert('Erro', error.message || 'Falha ao enviar e-mail');
    }
  }

  return (
    <LinearGradient colors={[colors.brand, colors.primary]} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={{ flex: 1 }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 justify-center px-6">
        <Pressable onPress={() => router.back()} className="absolute top-14 left-6 z-10 h-10 w-10 items-center justify-center rounded-full bg-white/15">
          <Ionicons name="arrow-back" size={22} color="white" />
        </Pressable>

        <Animated.View entering={FadeInDown.duration(400)}>
          <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-white/15">
            <Ionicons name={isSuccess ? 'mail-open-outline' : 'key-outline'} size={30} color="white" />
          </View>
          <Text className="mb-2 text-3xl font-extrabold text-white">Recuperar Senha</Text>
          <Text className="mb-8 text-white/70">
            {isSuccess ? 'Pronto! Verifique sua caixa de entrada.' : 'Digite seu e-mail para receber um link de recuperação.'}
          </Text>

          {!isSuccess ? (
            <View className="w-full gap-4">
              <View className="h-14 flex-row items-center rounded-full border border-white/20 bg-white/10 px-5">
                <Ionicons name="mail-outline" size={20} color="white" />
                <Input
                  placeholder="Seu e-mail"
                  placeholderTextColor="rgba(255,255,255,0.65)"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  className="ml-3 h-14 flex-1 border-0 bg-transparent dark:bg-transparent px-0 text-white shadow-none"
                />
              </View>

              <Pressable
                onPress={handleReset}
                disabled={resetPasswordMutation.isPending}
                className="w-full items-center rounded-full bg-white py-4 shadow-lg active:opacity-80 disabled:opacity-60"
              >
                {resetPasswordMutation.isPending ? (
                  <ActivityIndicator color={HEX.light.primary} />
                ) : (
                  <Text className="text-lg font-bold" style={{ color: HEX.light.brand }}>
                    Enviar Link
                  </Text>
                )}
              </Pressable>
            </View>
          ) : (
            <Pressable onPress={() => router.back()} className="mt-4 w-full items-center rounded-full bg-white/20 py-4">
              <Text className="text-lg font-bold text-white">Voltar para Login</Text>
            </Pressable>
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}
