import { Stack } from 'expo-router';

export default function SchedulerLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="create" />
      <Stack.Screen name="[id]" />
      <Stack.Screen name="firing" />
      <Stack.Screen name="sounds" />
    </Stack>
  );
}
