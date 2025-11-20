import { Stack } from 'expo-router';

export default function CameraLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="shoot" />
      <Stack.Screen name="preview" />
      <Stack.Screen name="analysis" />
      <Stack.Screen name="triggers" />
    </Stack>
  );
}

