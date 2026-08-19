import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, radius, shadow, spacing, typography } from '../constants/theme';

const MENU = [
  { icon: 'car-electric',         label: 'My Vehicles',       screen: 'Vehicles' },
  { icon: 'history',              label: 'Charging History',   screen: null },
  { icon: 'bell-outline',         label: 'Notifications',      screen: null },
  { icon: 'shield-check-outline', label: 'Privacy & Security', screen: null },
  { icon: 'help-circle-outline',  label: 'Help & Support',     screen: null },
  { icon: 'logout',               label: 'Log Out',            screen: null, danger: true },
];

export default function ProfileScreen({ navigation }: any) {
  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar style="dark" />
      <View style={s.header}><Text style={s.title}>Profile</Text></View>
      <View style={s.profileCard}>
        <View style={s.avatar}>
          <MaterialCommunityIcons name="account-circle" size={56} color={colors.onPrimary} />
        </View>
        <View>
          <Text style={s.name}>Sarah Johnson</Text>
          <Text style={s.email}>sarah.johnson@email.com</Text>
        </View>
      </View>
      <View style={s.menuCard}>
        {MENU.map((item, i) => (
          <TouchableOpacity key={item.label}
            style={[s.menuItem, i < MENU.length - 1 && s.menuBorder]}
            onPress={() => item.screen && navigation.navigate(item.screen)}
            activeOpacity={0.7}>
            <View style={s.menuLeft}>
              <MaterialCommunityIcons name={item.icon as any} size={20}
                color={'danger' in item ? colors.secondary : colors.onSurfaceVariant} />
              <Text style={[s.menuLabel, 'danger' in item && s.menuLabelDanger]}>{item.label}</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={18} color={colors.outline} />
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.base, paddingVertical: spacing.md },
  title: { fontSize: 22, fontWeight: '700', color: colors.onSurface },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.primaryContainer, marginHorizontal: spacing.base,
    borderRadius: radius.xl, padding: spacing.lg, marginBottom: spacing.lg },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 18, fontWeight: '700', color: colors.onPrimary },
  email: { ...typography.bodySm, color: colors.onPrimaryContainer, marginTop: 2 },
  menuCard: { backgroundColor: colors.surfaceContainerLowest, marginHorizontal: spacing.base,
    borderRadius: radius.xl, ...shadow.card },
  menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.base, paddingVertical: 16 },
  menuBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.outlineVariant },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  menuLabel: { ...typography.bodyMd, color: colors.onSurface },
  menuLabelDanger: { color: colors.secondary },
});
