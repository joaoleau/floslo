import { Stack } from 'expo-router';

export default function ObjectLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="create" />
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
