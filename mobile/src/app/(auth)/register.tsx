import React, { useState } from 'react';
import { View, Pressable, ActivityIndicator, KeyboardAvoidingView, Platform, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '@/components/ui/text';
import { Input } from '@/components/ui/input';
import { useRegisterMutation } from '@/hooks/useAuth';

export default function RegisterScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const registerMutation = useRegisterMutation();

  async function handleRegister() {
    if (!email || !username || !password) {
      Alert.alert('Atenção', 'Preencha todos os campos.');
      return;
    }

    try {
      await registerMutation.mutateAsync({ email, username, password });
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Falha ao criar conta');
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 bg-brand-100">
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24 }}>
        
        <Pressable onPress={() => router.back()} className="absolute top-14 left-6 z-10">
          <Ionicons name="arrow-back" size={28} color="white" />
        </Pressable>

        <View className="mb-8 mt-20">
          <Text className="text-3xl font-bold text-white mb-2">Criar Conta</Text>
          <Text className="text-brand-50">Junte-se ao Floslo e revolucione suas manhãs.</Text>
        </View>

        <View className="w-full">
          <Input
            placeholder="E-mail"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            className="h-12 bg-white/10 text-white border-white/20 mb-4"
          />

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
            className="h-12 bg-white/10 text-white border-white/20 mb-8"
          />

          <Pressable
            onPress={handleRegister}
            disabled={registerMutation.isPending}
            className={`w-full py-4 rounded-xl items-center ${registerMutation.isPending ? 'bg-brand-500/50' : 'bg-brand-500'}`}
          >
            {registerMutation.isPending ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-bold text-lg">Cadastrar</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}