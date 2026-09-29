import { Stack } from 'expo-router';
import { CommandStore } from '../store';
import { colors } from '../components';
export default function Layout() {
  return <CommandStore><Stack screenOptions={{ headerStyle: { backgroundColor: colors.bg }, headerTintColor: colors.ink }}>
    <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    <Stack.Screen name="job" options={{ title: 'Work details' }} />
  </Stack></CommandStore>;
}
