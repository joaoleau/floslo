import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from '@/components/common/Screen';
import { Header } from '@/components/common/Header';
import { ErrorState } from '@/components/common/ErrorState';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordRequirements } from '@/components/common/PasswordRequirements';

import { useMeQuery, useDeleteMeMutation, useUpdateMeMutation } from '@/hooks/useUser';
import { authService } from '@/services/authService';
import { showAlert } from '@/services/alertService';
import { useTheme, ThemePreference } from '@/lib/ThemeProvider';
import { useThemeColors } from '@/hooks/useThemeColors';
import { isPasswordValid } from '@/lib/passwordPolicy';
import { errorMessage } from '@/i18n/errors';
import { useLanguagePreference } from '@/hooks/useLanguagePreference';
import { LanguagePreference } from '@/i18n';

// O rótulo de cada opção fica no dicionário, em profile.theme.<value> e profile.language.<value>.
const THEME_OPTIONS: { value: ThemePreference; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'light', icon: 'sunny-outline' },
  { value: 'dark', icon: 'moon-outline' },
  { value: 'system', icon: 'phone-portrait-outline' },
];

// Os nomes dos idiomas ficam sempre no próprio idioma ("Português", "English"), para quem
// abriu o app no idioma errado reconhecer o seu.
const LANGUAGE_OPTIONS: { value: LanguagePreference; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'pt', icon: 'language-outline' },
  { value: 'en', icon: 'language-outline' },
  { value: 'system', icon: 'phone-portrait-outline' },
];

export default function Profile() {
  const router = useRouter();
  const colors = useThemeColors();
  const { t } = useTranslation();
  const { preference, setPreference } = useTheme();
  const language = useLanguagePreference();

  const { data: user, isPending, isError, refetch } = useMeQuery();
  const deleteMeMutation = useDeleteMeMutation();
  const updateMeMutation = useUpdateMeMutation();

  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [editedUsername, setEditedUsername] = useState('');

  function startEditingUsername() {
    if (!user) return;
    setEditedUsername(user.username);
    setIsEditingUsername(true);
  }

  async function handleSaveUsername() {
    if (!user) return;
    const username = editedUsername.trim();
    if (!username) {
      showAlert(t('common.attention'), t('profile.usernameRequired'));
      return;
    }
    if (username === user.username) {
      setIsEditingUsername(false);
      return;
    }

    try {
      await updateMeMutation.mutateAsync({ username });
      setIsEditingUsername(false);
    } catch (err) {
      console.error('[Profile] Falha ao atualizar apelido', err);
      showAlert(t('common.error'), errorMessage(err, 'profile.usernameFailed'));
    }
  }

  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  async function handleChangePassword() {
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      showAlert(t('common.attention'), t('profile.password.fieldsRequired'));
      return;
    }
    if (!isPasswordValid(newPassword)) {
      showAlert(t('auth.weakPassword.title'), t('auth.weakPassword.newMessage'));
      return;
    }
    if (newPassword !== confirmNewPassword) {
      showAlert(t('common.attention'), t('auth.newPassword.mismatch'));
      return;
    }

    try {
      await updateMeMutation.mutateAsync({ password: newPassword, current_password: currentPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setShowChangePassword(false);
      showAlert(t('common.success'), t('auth.newPassword.changed'));
    } catch (err) {
      console.error('[Profile] Falha ao trocar senha', err);
      showAlert(t('common.error'), errorMessage(err, 'profile.password.failed'));
    }
  }

  async function handleLogout() {
    await authService.logout();
    router.replace('/(auth)/login');
  }

  function handleDeleteAccount() {
    showAlert(
      t('profile.deleteAccount.title'),
      t('profile.deleteAccount.confirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMeMutation.mutateAsync();
              await authService.logout();
              router.replace('/(auth)/login');
            } catch (err) {
              console.error('[Profile] Falha ao excluir conta', err);
              showAlert(t('common.error'), t('profile.deleteAccount.failed'));
            }
          },
        },
      ]
    );
  }

  return (
    <Screen edges={['top', 'left', 'right']}>
      <Header title={t('profile.title')} showBackButton={false} />

      {isPending ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      ) : isError || !user ? (
        <ErrorState message={t('profile.loadFailed')} onRetry={() => refetch()} />
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-4 p-4 pb-28"
          showsVerticalScrollIndicator={false}
        >
          <Card className="rounded-3xl p-5 gap-4">
            <View className="flex-row items-center gap-4">
              <View className="h-14 w-14 items-center justify-center rounded-full bg-brand-100">
                <Ionicons name="person" size={28} color="white" />
              </View>
              <View className="flex-1">
                {isEditingUsername ? (
                  <View className="gap-2">
                    <Input
                      autoFocus
                      value={editedUsername}
                      onChangeText={setEditedUsername}
                      onSubmitEditing={handleSaveUsername}
                      autoCapitalize="none"
                    />
                    <View className="flex-row gap-2">
                      <Pressable hitSlop={8} onPress={handleSaveUsername} disabled={updateMeMutation.isPending}>
                        <Ionicons name="checkmark-circle" size={24} color={colors.brand} />
                      </Pressable>
                      <Pressable hitSlop={8} onPress={() => setIsEditingUsername(false)}>
                        <Ionicons name="close-circle" size={24} color={colors.mutedForeground} />
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <View className="flex-row items-center gap-2">
                    <Text className="text-lg font-semibold text-foreground">{user.username}</Text>
                    <Pressable hitSlop={8} onPress={startEditingUsername}>
                      <Ionicons name="pencil" size={14} color={colors.mutedForeground} />
                    </Pressable>
                  </View>
                )}
                <Text className="text-sm text-muted-foreground">{user.email}</Text>
              </View>
            </View>

            <View className="gap-4 border-t border-border pt-4">
              <Pressable
                onPress={() => setShowChangePassword((prev) => !prev)}
                className="flex-row items-center justify-between"
              >
                <View className="flex-row items-center gap-2">
                  <Ionicons name="lock-closed-outline" size={16} color={colors.brand} />
                  <Text className="font-semibold text-foreground">{t('profile.password.title')}</Text>
                </View>
                <Ionicons name={showChangePassword ? 'chevron-up' : 'chevron-down'} size={18} color={colors.brandSoft} />
              </Pressable>

              {showChangePassword && (
                <View className="gap-3">
                  <Input
                    placeholder={t('profile.password.current')}
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    secureTextEntry
                  />
                  <Input placeholder={t('auth.newPassword.newPassword')} value={newPassword} onChangeText={setNewPassword} secureTextEntry />
                  <Input
                    placeholder={t('auth.newPassword.confirm')}
                    value={confirmNewPassword}
                    onChangeText={setConfirmNewPassword}
                    secureTextEntry
                  />
                  {newPassword.length > 0 && (
                    <View className="rounded-xl bg-secondary p-3">
                      <PasswordRequirements password={newPassword} />
                    </View>
                  )}
                  <Button onPress={handleChangePassword} disabled={updateMeMutation.isPending} className="rounded-3xl bg-brand-100">
                    {updateMeMutation.isPending ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text className="font-semibold text-white">{t('profile.password.submit')}</Text>
                    )}
                  </Button>
                </View>
              )}
            </View>
          </Card>

          <Card className="rounded-3xl p-5 gap-4">
            <Text className="text-lg font-semibold text-foreground">{t('profile.theme.title')}</Text>
            <View className="flex-row gap-3">
              {THEME_OPTIONS.map((option) => {
                const isSelected = option.value === preference;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => setPreference(option.value)}
                    className={`flex-1 items-center gap-1.5 rounded-xl border py-3 ${
                      isSelected ? 'border-brand-100 bg-brand-100/10' : 'border-border'
                    }`}
                  >
                    <Ionicons name={option.icon} size={20} color={isSelected ? colors.brand : colors.brandSoft} />
                    <Text className={`text-xs ${isSelected ? 'font-semibold text-brand-100' : 'text-muted-foreground'}`}>
                      {t(`profile.theme.${option.value}`)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Card>

          <Card className="rounded-3xl p-5 gap-4">
            <Text className="text-lg font-semibold text-foreground">{t('profile.language.title')}</Text>
            <View className="flex-row gap-3">
              {LANGUAGE_OPTIONS.map((option) => {
                const isSelected = option.value === language.preference;
                return (
                  <Pressable
                    key={option.value}
                    testID={`language-option-${option.value}`}
                    onPress={() => language.setPreference(option.value)}
                    className={`flex-1 items-center gap-1.5 rounded-xl border py-3 ${
                      isSelected ? 'border-brand-100 bg-brand-100/10' : 'border-border'
                    }`}
                  >
                    <Ionicons name={option.icon} size={20} color={isSelected ? colors.brand : colors.brandSoft} />
                    <Text className={`text-xs ${isSelected ? 'font-semibold text-brand-100' : 'text-muted-foreground'}`}>
                      {t(`profile.language.${option.value}`)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text className="text-xs text-muted-foreground">{t('profile.language.hint')}</Text>
          </Card>

          <Pressable
            testID="open-terms"
            onPress={() => router.push('/terms')}
            className="flex-row items-center justify-between rounded-3xl border border-border bg-card px-5 py-4"
          >
            <View className="flex-row items-center gap-2">
              <Ionicons name="document-text-outline" size={18} color={colors.brand} />
              <Text className="font-semibold text-foreground">{t('terms.title')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.brandSoft} />
          </Pressable>

          <Button
            onPress={handleDeleteAccount}
            disabled={deleteMeMutation.isPending}
            className="flex-row items-center justify-center rounded-3xl bg-red-600 py-2"
          >
            <Ionicons name="trash-outline" size={20} color="white" />
            <Text className="ml-2 font-semibold text-white">{t('profile.deleteAccount.title')}</Text>
          </Button>

          <Button onPress={handleLogout} variant="outline" className="rounded-3xl">
            <Ionicons name="log-out-outline" size={20} color={colors.brand} />
            <Text className="ml-2 font-semibold">{t('profile.logout')}</Text>
          </Button>
        </ScrollView>
      )}
    </Screen>
  );
}
