import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from '@/components/common/Screen';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AuthBackground } from '@/components/auth/AuthBackground';
import { AuthLoadingScreen } from '@/components/auth/AuthLoadingScreen';

import { useLoginMutation } from '@/hooks/useAuth';
import { useThemeColors } from '@/hooks/useThemeColors';
import { showAlert } from '@/services/alertService';
import { sessionService } from '@/services/sessionService';
import { errorMessage } from '@/i18n/errors';

export default function LoginScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const colors = useThemeColors();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const loginMutation = useLoginMutation();

  async function handleLogin() {
    if (!username || !password) {
      showAlert(t('common.attention'), t('auth.login.fieldsRequired'));
      return;
    }

    try {
      await loginMutation.mutateAsync({ username, password });
      router.replace(await sessionService.start());
    } catch (error) {
      console.error('[Login] Falha ao fazer login', error);
      showAlert(t('common.error'), errorMessage(error, 'auth.login.failed'));
    }
  }

  if (loginMutation.isPending) {
    return (
      <Screen edges={['top', 'left', 'right', 'bottom']}>
        <AuthLoadingScreen />
      </Screen>
    );
  }

  return (
    <Screen edges={['top', 'left', 'right', 'bottom']}>
      <AuthBackground>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 20 }}
            keyboardShouldPersistTaps="handled"
          >
            <Card className="rounded-3xl p-5 gap-3">
              <Input placeholder={t('auth.login.usernameOrEmail')} value={username} onChangeText={setUsername} autoCapitalize="none" />

              <View className="flex-row items-center">
                <Input
                  placeholder={t('auth.password')}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  className="flex-1 pr-10"
                />
                <Pressable hitSlop={10} onPress={() => setShowPassword((prev) => !prev)} className="absolute right-3">
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.mutedForeground} />
                </Pressable>
              </View>

              <Pressable onPress={() => router.push('/(auth)/forgot-password')} className="self-end">
                <Text className="text-sm font-medium text-[#3B82F6]">{t('auth.login.forgotPassword')}</Text>
              </Pressable>

              <Button onPress={handleLogin} className="mt-1 rounded-3xl bg-brand-100">
                <Text className="font-semibold text-white">{t('auth.login.submit')}</Text>
              </Button>
            </Card>

            <View className="mt-6 flex-row justify-center">
              <Text className="text-muted-foreground">{t('auth.login.noAccount')} </Text>
              <Pressable onPress={() => router.push('/(auth)/register')}>
                <Text className="font-semibold text-[#3B82F6]">{t('auth.login.signUp')}</Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </AuthBackground>
    </Screen>
  );
}
