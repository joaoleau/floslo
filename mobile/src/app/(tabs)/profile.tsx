import { ActivityIndicator, Alert, View } from 'react-native';
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

export default function Profile() {
  const router = useRouter();
  const { data: user, isPending, isError, refetch } = useMeQuery();
  const deleteMeMutation = useDeleteMeMutation();

  async function handleLogout() {
    await authService.logout();
    router.replace('/(auth)/login');
  }

  function handleDeleteAccount() {
    Alert.alert(
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
            } catch {
              Alert.alert('Erro', 'Falha ao excluir a conta.');
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
          <ActivityIndicator size="large" color="#FFFFFF" />
        </View>
      ) : isError || !user ? (
        <ErrorState message="Não foi possível carregar seu perfil." onRetry={() => refetch()} />
      ) : (
        <View className="flex-1 gap-4 p-4">
          <Card className="rounded-3xl bg-white p-5 gap-4">
            <View className="flex-row items-center gap-4">
              <View className="h-14 w-14 items-center justify-center rounded-full bg-brand-100">
                <Ionicons name="person" size={28} color="white" />
              </View>
              <View className="flex-1">
                <Text className="text-lg font-semibold text-brand-100">{user.username}</Text>
                <Text className="text-sm text-zinc-500">{user.email}</Text>
              </View>
            </View>
          </Card>

          <Button onPress={handleLogout} variant="outline" className="rounded-3xl">
            <Ionicons name="log-out-outline" size={20} color="#303031" />
            <Text className="ml-2 font-semibold">Sair</Text>
          </Button>

          <Button
            onPress={handleDeleteAccount}
            disabled={deleteMeMutation.isPending}
            className="flex-row items-center justify-center rounded-3xl bg-red-600 py-2 mt-auto"
          >
            <Ionicons name="trash-outline" size={20} color="white" />
            <Text className="ml-2 font-semibold text-white">Excluir conta</Text>
          </Button>
        </View>
      )}
    </Screen>
  );
}
