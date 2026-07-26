import { Stack } from 'expo-router';
import { PortalHost } from '@rn-primitives/portal';
import 'react-native-reanimated';

export default function RootLayoutNav() {
  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(object)" />
        <Stack.Screen name="(scheduler)" />
      </Stack>

      <PortalHost />
    </>
  );
}
