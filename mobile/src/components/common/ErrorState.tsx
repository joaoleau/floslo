import { View } from 'react-native';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';

interface ErrorStateProps {
  message?: string;
  onRetry: () => void;
}

export function ErrorState({ message = 'Não foi possível carregar os dados.', onRetry }: ErrorStateProps) {
  return (
    <View className="flex-1 justify-center items-center gap-4 px-8">
      <Text className="text-center text-muted-foreground">{message}</Text>
      <Button onPress={onRetry} className="rounded-3xl">
        <Text>Tentar novamente</Text>
      </Button>
    </View>
  );
}
