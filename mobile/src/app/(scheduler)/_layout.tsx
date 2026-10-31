import { Stack } from 'expo-router';

export default function SchedulerLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="create" />
      <Stack.Screen name="[id]" />
      <Stack.Screen name="sounds" />
      
      <Stack.Screen 
        name="firing" 
        options={{ 
          presentation: 'fullScreenModal',
          animation: 'slide_from_bottom',
          gestureEnabled: false
        }} 
      />
    </Stack>
  );
}