import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
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
import { errorMessage } from '@/i18n/errors';
import { TERMS_VERSION } from '@/constants/terms';

export default function RegisterScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const colors = useThemeColors();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const registerMutation = useRegisterMutation();

  async function handleRegister() {
    if (!email || !username || !password) {
      showAlert(t('common.attention'), t('auth.register.fieldsRequired'));
      return;
    }
    if (!isPasswordValid(password)) {
      showAlert(t('auth.weakPassword.title'), t('auth.weakPassword.message'));
      return;
    }
    if (!acceptedTerms) {
      showAlert(t('common.attention'), t('terms.acceptRequired'));
      return;
    }

    try {
      await registerMutation.mutateAsync({ email, username, password, accepted_terms_version: TERMS_VERSION });
      router.replace(await sessionService.start());
    } catch (error) {
      console.error('[Register] Falha ao criar conta', error);
      showAlert(t('common.error'), errorMessage(error, 'auth.register.failed'));
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
      <Header title={t('auth.register.title')} />
      <AuthBackground>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
            <Card className="rounded-3xl p-5 gap-3">
              <Input placeholder={t('auth.email')} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />

              <Input placeholder={t('auth.register.username')} value={username} onChangeText={setUsername} autoCapitalize="none" />

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

              {password.length > 0 && (
                <View className="rounded-xl bg-secondary p-3">
                  <PasswordRequirements password={password} />
                </View>
              )}

              {/* O aceite é o consentimento da LGPD, inclusive para a transferência dos dados aos
                  Estados Unidos: fica desmarcado até o usuário marcar, e o cadastro exige. A caixa e
                  o texto marcam o aceite; o trecho sublinhado abre os termos. O texto não fica dentro
                  de um Pressable: ali o toque no trecho sublinhado ia para o Pressable e só marcava a
                  caixa, sem abrir os termos. */}
              <View className="flex-row items-start gap-2 py-1">
                <Pressable
                  testID="accept-terms"
                  onPress={() => setAcceptedTerms((prev) => !prev)}
                  hitSlop={8}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: acceptedTerms }}
                >
                  <Ionicons
                    name={acceptedTerms ? 'checkbox' : 'square-outline'}
                    size={20}
                    color={acceptedTerms ? colors.brand : colors.mutedForeground}
                  />
                </Pressable>
                {/* Cor e sublinhado do link no style (e não no className) para valerem no trecho
                    aninhado do texto. */}
                <Text className="flex-1 text-sm text-muted-foreground" onPress={() => setAcceptedTerms((prev) => !prev)}>
                  {t('terms.acceptBefore')}
                  <Text
                    testID="terms-link"
                    onPress={() => router.push('/terms')}
                    style={{ color: '#3B82F6', fontWeight: '600', textDecorationLine: 'underline' }}
                  >
                    {t('terms.acceptLink')}
                  </Text>
                  {t('terms.acceptAfter')}
                </Text>
              </View>

              <Button onPress={handleRegister} className="mt-1 rounded-3xl bg-brand-100">
                <Text className="font-semibold text-white">{t('auth.register.submit')}</Text>
              </Button>
            </Card>
          </ScrollView>
        </KeyboardAvoidingView>
      </AuthBackground>
    </Screen>
  );
}
