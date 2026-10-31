import { ActivityIndicator, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '@/components/ui/text';
import { AuthBackground } from '@/components/auth/AuthBackground';
import { useThemeColors } from '@/hooks/useThemeColors';

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
