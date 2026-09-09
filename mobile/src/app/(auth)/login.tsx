import React, { useState } from 'react';
import { View, Pressable, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';

import { Text } from '@/components/ui/text';
import { Input } from '@/components/ui/input';

import { useLoginMutation } from '@/hooks/useAuth';
import { useThemeColors } from '@/hooks/useThemeColors';
import { HEX } from '@/lib/theme-tokens';
import { showAlert } from '@/services/alertService';

export default function LoginScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const loginMutation = useLoginMutation();

  async function handleLogin() {
    if (!username || !password) {
      showAlert('Atenção', 'Preencha usuário e senha.');
      return;
    }

    try {
      await loginMutation.mutateAsync({ username, password });
      router.replace('/(tabs)');
    } catch (error: any) {
      console.error('[Login] Falha ao fazer login', error);
      showAlert('Erro', error.message || 'Falha ao fazer login');
    }
  }

  return (
    <LinearGradient colors={[colors.brand, colors.primary]} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={{ flex: 1 }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 64, paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View entering={FadeIn.duration(500)} className="mb-10 items-center">
            <View className="mb-4 h-20 w-20 items-center justify-center rounded-full bg-white/15">
              <Ionicons name="flame" size={40} color="white" />
            </View>
            <Text className="mb-2 text-4xl font-extrabold text-white">Floslo</Text>
            <Text className="text-center text-white/70">Entre para continuar acordando na hora certa.</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(100).duration(400)} className="w-full gap-4">
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

            <Pressable onPress={() => router.push('/(auth)/reset-password')} className="self-end">
              <Text className="text-sm font-medium text-white/70">Esqueceu a senha?</Text>
            </Pressable>

            <Pressable
              onPress={handleLogin}
              disabled={loginMutation.isPending}
              className="mt-2 w-full items-center rounded-full bg-white py-4 shadow-lg active:opacity-80 disabled:opacity-60"
            >
              {loginMutation.isPending ? (
                <ActivityIndicator color={HEX.light.primary} />
              ) : (
                <Text className="text-lg font-bold" style={{ color: HEX.light.brand }}>
                  Entrar
                </Text>
              )}
            </Pressable>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(200).duration(400)} className="mt-8 flex-row justify-center">
            <Text className="text-white/70">Não tem uma conta? </Text>
            <Pressable onPress={() => router.push('/(auth)/register')}>
              <Text className="font-bold text-white">Cadastre-se</Text>
            </Pressable>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}
