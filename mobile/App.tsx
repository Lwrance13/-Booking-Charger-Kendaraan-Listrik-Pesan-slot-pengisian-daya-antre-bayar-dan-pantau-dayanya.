import React, { useRef } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createBottomTabNavigator, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

import DashboardScreen from './screens/DashboardScreen';
import SlotsScreen from './screens/SlotsScreen';
import PowerScreen from './screens/PowerScreen';
import TariffsScreen from './screens/TariffsScreen';
import Sidebar from './components/Sidebar';
import { DrawerProvider, useDrawer } from './context/DrawerContext';
import { colors, radius, spacing, typography } from './constants/theme';

const Tab = createBottomTabNavigator();

const TAB_CONFIG = [
  { name: 'Stations', icon: 'ev-station', component: DashboardScreen },
  { name: 'Slots',    icon: 'grid',        component: SlotsScreen },
  { name: 'Power',    icon: 'lightning-bolt', component: PowerScreen },
  { name: 'Tariffs',  icon: 'tag-multiple', component: TariffsScreen },
] as const;

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  return (
    <View style={tabStyles.bar}>
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const tab = TAB_CONFIG[index];

        return (
          <Pressable
            key={route.key}
            style={tabStyles.item}
            onPress={() => navigation.navigate(route.name)}
            android_ripple={{ color: 'transparent' }}
          >
            <View style={[tabStyles.pill, focused && tabStyles.pillActive]}>
              <MaterialCommunityIcons
                name={tab.icon as any}
                size={22}
                color={focused ? colors.onPrimary : colors.onSurfaceVariant}
              />
            </View>
            <Text style={[tabStyles.label, focused && tabStyles.labelActive]}>
              {route.name}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function App() {
  const navRef = useRef<NavigationContainerRef<any>>(null);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <DrawerProvider>
        <NavigationContainer ref={navRef}>
          <Tab.Navigator
            tabBar={(props) => <CustomTabBar {...props} />}
            screenOptions={{ headerShown: false }}
          >
            {TAB_CONFIG.map((tab) => (
              <Tab.Screen key={tab.name} name={tab.name} component={tab.component} />
            ))}
          </Tab.Navigator>
        </NavigationContainer>
        <SidebarWrapper navRef={navRef} />
      </DrawerProvider>
    </SafeAreaProvider>
  );
}

function SidebarWrapper({ navRef }: { navRef: React.RefObject<NavigationContainerRef<any> | null> }) {
  const { visible } = useDrawer();
  const currentRoute = navRef.current?.getCurrentRoute()?.name ?? 'Stations';
  if (!visible) return null;
  return (
    <Sidebar
      activeTab={currentRoute}
      onNavigate={(tab) => navRef.current?.navigate(tab)}
    />
  );
}

const tabStyles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainerLowest,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.outlineVariant,
    paddingBottom: spacing.sm,
    paddingTop: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  pill: {
    width: 56,
    height: 32,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillActive: {
    backgroundColor: colors.primaryContainer,
  },
  label: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  },
  labelActive: {
    color: colors.primaryContainer,
    fontWeight: '600',
  },
});
