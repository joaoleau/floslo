import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from '@/components/common/Screen';
import { Header } from '@/components/common/Header';
import { ErrorState } from '@/components/common/ErrorState';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';

import { useMeQuery, useDeleteMeMutation } from '@/hooks/useUser';
import { authService } from '@/services/authService';
import { showAlert } from '@/services/alertService';
import { useTheme, ThemePreference } from '@/lib/ThemeProvider';
import { useThemeColors } from '@/hooks/useThemeColors';

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'light', label: 'Claro', icon: 'sunny-outline' },
  { value: 'dark', label: 'Escuro', icon: 'moon-outline' },
  { value: 'system', label: 'Automático', icon: 'phone-portrait-outline' },
];

export default function Profile() {
  const router = useRouter();
  const colors = useThemeColors();
  const { preference, setPreference } = useTheme();

  const { data: user, isPending, isError, refetch } = useMeQuery();
  const deleteMeMutation = useDeleteMeMutation();

  async function handleLogout() {
    await authService.logout();
    router.replace('/(auth)/login');
  }

  function handleDeleteAccount() {
    showAlert(
      'Excluir conta',
      'Tem certeza que deseja excluir sua conta? Esta ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMeMutation.mutateAsync();
              await authService.logout();
              router.replace('/(auth)/login');
            } catch (err) {
              console.error('[Profile] Falha ao excluir conta', err);
              showAlert('Erro', 'Falha ao excluir a conta.');
            }
          },
        },
      ]
    );
  }

  return (
    <Screen edges={['top', 'left', 'right']}>
      <Header title="Perfil" showBackButton={false} />

      {isPending ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      ) : isError || !user ? (
        <ErrorState message="Não foi possível carregar seu perfil." onRetry={() => refetch()} />
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
                <Text className="text-lg font-semibold text-foreground">{user.username}</Text>
                <Text className="text-sm text-muted-foreground">{user.email}</Text>
              </View>
            </View>
          </Card>

          <Card className="rounded-3xl p-5 gap-3">
            <Text className="text-lg font-semibold text-foreground">Aparência</Text>
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
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Card>

          <Button
            onPress={handleDeleteAccount}
            disabled={deleteMeMutation.isPending}
            className="flex-row items-center justify-center rounded-3xl bg-red-600 py-2"
          >
            <Ionicons name="trash-outline" size={20} color="white" />
            <Text className="ml-2 font-semibold text-white">Excluir conta</Text>
          </Button>

          <Button onPress={handleLogout} variant="outline" className="rounded-3xl">
            <Ionicons name="log-out-outline" size={20} color={colors.brand} />
            <Text className="ml-2 font-semibold">Sair</Text>
          </Button>
        </ScrollView>
      )}
    </Screen>
  );
}
