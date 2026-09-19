import { ActivityIndicator, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '@/components/ui/text';
import { AuthBackground } from '@/components/auth/AuthBackground';
import { useThemeColors } from '@/hooks/useThemeColors';

// A marca (ícone + "Floslo") que antes ficava fixa na tela de login agora só aparece
// aqui, no intervalo curto de entrar/cadastrar -- um momento de marca, não decoração
// permanente da tela de formulário.
export function AuthLoadingScreen() {
  const colors = useThemeColors();

  return (
    <AuthBackground>
      <View className="flex-1 items-center justify-center">
        <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-brand-100">
          <Ionicons name="flame" size={32} color="white" />
        </View>
        <Text variant="h3" className="mb-6">
          Floslo
        </Text>
        <ActivityIndicator color={colors.brand} />
      </View>
    </AuthBackground>
  );
}
