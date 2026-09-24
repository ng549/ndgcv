import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { colors } from '../../components';
export default function Layout() {
  return <Tabs screenOptions={{ headerTitle: 'Nexus', headerStyle: { backgroundColor: colors.bg }, headerTintColor: colors.ink,
    tabBarStyle: { backgroundColor: colors.bg }, tabBarActiveTintColor: colors.accent, tabBarInactiveTintColor: colors.muted }}>
    <Tabs.Screen name="index" options={{ title: 'Agency', tabBarIcon: ({ color }) => <Text style={{ color }}>◎</Text> }} />
    <Tabs.Screen name="work" options={{ title: 'Work', tabBarIcon: ({ color }) => <Text style={{ color }}>▣</Text> }} />
    <Tabs.Screen name="approvals" options={{ title: 'Approvals', tabBarIcon: ({ color }) => <Text style={{ color }}>✓</Text> }} />
    <Tabs.Screen name="devil-up" options={{ title: 'Devil Up', tabBarIcon: ({ color }) => <Text style={{ color }}>↗</Text> }} />
  </Tabs>;
}
