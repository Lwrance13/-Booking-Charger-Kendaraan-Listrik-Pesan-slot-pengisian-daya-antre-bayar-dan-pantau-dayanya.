import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

import HomeScreen     from './screens/HomeScreen';
import BookingsScreen from './screens/BookingsScreen';
import WalletScreen   from './screens/WalletScreen';
import ProfileScreen  from './screens/ProfileScreen';
import BookSessionScreen from './screens/BookSessionScreen';
import StationMapScreen  from './screens/StationMapScreen';
import VehiclesScreen    from './screens/VehiclesScreen';
import { colors, radius, spacing, typography } from './constants/theme';

const Tab   = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const TABS = [
  { name: 'Home',     icon: 'home-outline',      component: HomeScreen },
  { name: 'Bookings', icon: 'calendar-check-outline', component: BookingsScreen },
  { name: 'Wallet',   icon: 'wallet-outline',    component: WalletScreen },
  { name: 'Profile',  icon: 'account-outline',   component: ProfileScreen },
] as const;

function TabBar({ state, navigation }: BottomTabBarProps) {
  return (
    <View style={t.bar}>
      {state.routes.map((route, i) => {
        const focused = state.index === i;
        const tab = TABS[i];
        return (
          <Pressable key={route.key} style={t.item} onPress={() => navigation.navigate(route.name)}>
            <View style={[t.iconWrap, focused && t.iconWrapActive]}>
              <MaterialCommunityIcons
                name={tab.icon as any}
                size={22}
                color={focused ? colors.onPrimary : colors.onSurfaceVariant}
              />
            </View>
            <Text style={[t.label, focused && t.labelActive]}>{tab.name}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function TabNavigator() {
  return (
    <Tab.Navigator tabBar={(p) => <TabBar {...p} />} screenOptions={{ headerShown: false }}>
      {TABS.map(tab => <Tab.Screen key={tab.name} name={tab.name} component={tab.component} />)}
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Main"         component={TabNavigator} />
          <Stack.Screen name="BookSession"  component={BookSessionScreen}
            options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="StationMap"   component={StationMapScreen}
            options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="Vehicles"     component={VehiclesScreen}
            options={{ animation: 'slide_from_right' }} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const t = StyleSheet.create({
  bar: { flexDirection: 'row', backgroundColor: colors.surfaceContainerLowest,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.outlineVariant,
    paddingBottom: spacing.sm, paddingTop: spacing.xs, paddingHorizontal: spacing.base },
  item: { flex: 1, alignItems: 'center', gap: 3 },
  iconWrap: { width: 56, height: 36, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  iconWrapActive: { backgroundColor: colors.primaryContainer },
  label: { ...typography.labelSm, color: colors.onSurfaceVariant },
  labelActive: { color: colors.primaryContainer, fontWeight: '600' },
});
