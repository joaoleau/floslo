import { Stack } from 'expo-router';

export default function HistoryLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="session/[id]" />
      <Stack.Screen name="tag/[tag]" />
      <Stack.Screen name="attempt/[id]" />
    </Stack>
  );
}
