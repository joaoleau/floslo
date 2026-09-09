import React, { useState } from 'react';
import { View, Pressable, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';

import { Text } from '@/components/ui/text';
import { Input } from '@/components/ui/input';
import { useRegisterMutation } from '@/hooks/useAuth';
import { useThemeColors } from '@/hooks/useThemeColors';
import { HEX } from '@/lib/theme-tokens';
import { showAlert } from '@/services/alertService';

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

    try {
      await registerMutation.mutateAsync({ email, username, password });
      router.replace('/(tabs)');
    } catch (error: any) {
      console.error('[Register] Falha ao criar conta', error);
      showAlert('Erro', error.message || 'Falha ao criar conta');
    }
  }

  return (
    <LinearGradient colors={[colors.brand, colors.primary]} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={{ flex: 1 }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 64, paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable onPress={() => router.back()} className="absolute top-14 left-6 z-10 h-10 w-10 items-center justify-center rounded-full bg-white/15">
            <Ionicons name="arrow-back" size={22} color="white" />
          </Pressable>

          <Animated.View entering={FadeIn.duration(500)} className="mb-10">
            <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-white/15">
              <Ionicons name="flame" size={32} color="white" />
            </View>
            <Text className="mb-2 text-3xl font-extrabold text-white">Criar Conta</Text>
            <Text className="text-white/70">Junte-se ao Floslo e revolucione suas manhãs.</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(100).duration(400)} className="w-full gap-4">
            <View className="h-14 flex-row items-center rounded-full border border-white/20 bg-white/10 px-5">
              <Ionicons name="mail-outline" size={20} color="white" />
              <Input
                placeholder="E-mail"
                placeholderTextColor="rgba(255,255,255,0.65)"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                className="ml-3 h-14 flex-1 border-0 bg-transparent dark:bg-transparent px-0 text-white shadow-none"
              />
            </View>

            <View className="h-14 flex-row items-center rounded-full border border-white/20 bg-white/10 px-5">
              <Ionicons name="person-outline" size={20} color="white" />
              <Input
                placeholder="Nome de usuário"
                placeholderTextColor="rgba(255,255,255,0.65)"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                className="ml-3 h-14 flex-1 border-0 bg-transparent dark:bg-transparent px-0 text-white shadow-none"
              />
            </View>

            <View className="h-14 flex-row items-center rounded-full border border-white/20 bg-white/10 px-5">
              <Ionicons name="lock-closed-outline" size={20} color="white" />
              <Input
                placeholder="Senha"
                placeholderTextColor="rgba(255,255,255,0.65)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                className="ml-3 h-14 flex-1 border-0 bg-transparent dark:bg-transparent px-0 text-white shadow-none"
              />
              <Pressable hitSlop={10} onPress={() => setShowPassword((prev) => !prev)}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="white" />
              </Pressable>
            </View>

            <Pressable
              onPress={handleRegister}
              disabled={registerMutation.isPending}
              className="mt-2 w-full items-center rounded-full bg-white py-4 shadow-lg active:opacity-80 disabled:opacity-60"
            >
              {registerMutation.isPending ? (
                <ActivityIndicator color={HEX.light.primary} />
              ) : (
                <Text className="text-lg font-bold" style={{ color: HEX.light.brand }}>
                  Cadastrar
                </Text>
              )}
            </Pressable>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}
