import React, { useState } from 'react';
import { View, Pressable, ActivityIndicator, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '@/components/ui/text';
import { Input } from '@/components/ui/input';
import { useResetPasswordMutation } from '@/hooks/useAuth';

export default function ResetPasswordScreen() {
  const router = useRouter();
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
      Alert.alert('Erro', error.message || 'Falha ao enviar e-mail');
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 bg-brand-100 justify-center px-6">
      
      <Pressable onPress={() => router.back()} className="absolute top-14 left-6 z-10">
        <Ionicons name="arrow-back" size={28} color="white" />
      </Pressable>

      <View className="mb-8 mt-10">
        <Text className="text-3xl font-bold text-white mb-2">Recuperar Senha</Text>
        <Text className="text-brand-50">
          {isSuccess ? 'Pronto! Verifique sua caixa de entrada.' : 'Digite seu e-mail para receber um link de recuperação.'}
        </Text>
      </View>

      {!isSuccess ? (
        <View className="w-full">
          <Input
            placeholder="Seu e-mail"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            className="h-12 bg-white/10 text-white border-white/20 mb-6"
          />

          <Pressable
            onPress={handleReset}
            disabled={resetPasswordMutation.isPending}
            className={`w-full py-4 rounded-xl items-center ${resetPasswordMutation.isPending ? 'bg-brand-500/50' : 'bg-brand-500'}`}
          >
            {resetPasswordMutation.isPending ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-bold text-lg">Enviar Link</Text>
            )}
          </Pressable>
        </View>
      ) : (
        <Pressable
          onPress={() => router.back()}
          className="w-full bg-white/20 py-4 rounded-xl items-center mt-4"
        >
          <Text className="text-white font-bold text-lg">Voltar para Login</Text>
        </Pressable>
      )}
    </KeyboardAvoidingView>
  );
}