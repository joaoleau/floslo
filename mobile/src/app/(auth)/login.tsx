import React, { useState } from 'react';
import { View, Pressable, ActivityIndicator, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';

// Usando seus componentes customizados!
import { Text } from '@/components/ui/text';
import { Input } from '@/components/ui/input';

import { useLoginMutation } from '@/hooks/useAuth';

export default function LoginScreen() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const loginMutation = useLoginMutation();

  async function handleLogin() {
    if (!username || !password) {
      Alert.alert('Atenção', 'Preencha usuário e senha.');
      return;
    }

    try {
      await loginMutation.mutateAsync({ username, password });
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Falha ao fazer login');
    }
  }

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      className="flex-1 bg-brand-100 justify-center px-6"
    >
      <View className="items-center mb-10">
        <Text className="text-4xl font-bold text-white mb-2">Floslo</Text>
        <Text className="text-brand-50 text-center">Entre para continuar acordando na hora certa.</Text>
      </View>

      <View className="w-full space-y-4">
        <Input
          placeholder="Nome de usuário"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          className="h-12 bg-white/10 text-white border-white/20 mb-4" 
        />

        <Input
          placeholder="Senha"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          className="h-12 bg-white/10 text-white border-white/20"
        />

        <Pressable 
          onPress={() => router.push('/(auth)/reset-password')}
          className="self-end mt-2"
        >
          <Text className="text-brand-50 text-sm font-medium">Esqueceu a senha?</Text>
        </Pressable>

        <Pressable
          onPress={handleLogin}
          disabled={loginMutation.isPending}
          className={`w-full py-4 rounded-xl items-center mt-6 ${loginMutation.isPending ? 'bg-brand-500/50' : 'bg-brand-500'}`}
        >
          {loginMutation.isPending ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-bold text-lg">Entrar</Text>
          )}
        </Pressable>
      </View>

      <View className="flex-row justify-center mt-8">
        <Text className="text-brand-50">Não tem uma conta? </Text>
        <Pressable onPress={() => router.push('/(auth)/register')}>
          <Text className="text-white font-bold">Cadastre-se</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}