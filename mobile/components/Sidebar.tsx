import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
  Pressable, ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDrawer } from '../context/DrawerContext';
import { colors, radius, spacing, typography } from '../constants/theme';

const MENU_ITEMS = [
  { label: 'Stations',       icon: 'ev-station',      tab: 'Stations' },
  { label: 'Slots & Power',  icon: 'grid',             tab: 'Slots' },
  { label: 'Power Monitor',  icon: 'lightning-bolt',   tab: 'Power' },
  { label: 'Tariff Plans',   icon: 'tag-multiple',     tab: 'Tariffs' },
] as const;

const BOTTOM_ITEMS = [
  { label: 'Settings',   icon: 'cog-outline' },
  { label: 'Help',       icon: 'help-circle-outline' },
  { label: 'Log Out',    icon: 'logout', danger: true },
] as const;

interface SidebarProps {
  activeTab: string;
  onNavigate: (tab: string) => void;
}

export default function Sidebar({ activeTab, onNavigate }: SidebarProps) {
  const { close, slideAnim, visible } = useDrawer();
  const insets = useSafeAreaInsets();

  if (!visible) return null;

  return (
    <View style={styles.root}>
      {/* Scrim / overlay */}
      <Pressable style={styles.scrim} onPress={close} />

      {/* Drawer panel */}
      <Animated.View style={[styles.panel, { transform: [{ translateX: slideAnim }], paddingTop: insets.top + spacing.sm }]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoRow}>
            <View style={styles.logoBox}>
              <MaterialCommunityIcons name="ev-station" size={22} color={colors.onPrimary} />
            </View>
            <View>
              <Text style={styles.appName}>Emerald Charge</Text>
              <Text style={styles.appRole}>Admin Dashboard</Text>
            </View>
          </View>
          <TouchableOpacity onPress={close} style={styles.closeBtn}>
            <MaterialCommunityIcons name="close" size={22} color={colors.onSurfaceVariant} />
          </TouchableOpacity>
        </View>

        {/* Profile */}
        <View style={styles.profile}>
          <View style={styles.avatarCircle}>
            <MaterialCommunityIcons name="account-circle" size={44} color={colors.onPrimaryContainer} />
          </View>
          <View>
            <Text style={styles.profileName}>Admin User</Text>
            <Text style={styles.profileRole}>Station Manager</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Navigation */}
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionLabel}>NAVIGATION</Text>
          {MENU_ITEMS.map((item) => {
            const active = activeTab === item.tab;
            return (
              <TouchableOpacity
                key={item.tab}
                style={[styles.menuItem, active && styles.menuItemActive]}
                onPress={() => { onNavigate(item.tab); close(); }}
                activeOpacity={0.7}
              >
                {active && <View style={styles.activeBar} />}
                <MaterialCommunityIcons
                  name={item.icon as any}
                  size={20}
                  color={active ? colors.onPrimary : colors.onSurfaceVariant}
                />
                <Text style={[styles.menuLabel, active && styles.menuLabelActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}

          <View style={styles.divider} />
          <Text style={styles.sectionLabel}>SYSTEM</Text>

          {BOTTOM_ITEMS.map((item) => (
            <TouchableOpacity key={item.label} style={styles.menuItem} activeOpacity={0.7}>
              <MaterialCommunityIcons
                name={item.icon as any}
                size={20}
                color={'danger' in item ? colors.secondary : colors.onSurfaceVariant}
              />
              <Text style={[styles.menuLabel, 'danger' in item && styles.menuLabelDanger]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Footer */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.base }]}>
          <Text style={styles.footerText}>Emerald Charge v1.0.0</Text>
        </View>
      </Animated.View>
    </View>
  );
}

const PANEL_W = 280;
const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, zIndex: 999 },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  panel: {
    position: 'absolute', top: 0, bottom: 0, left: 0,
    width: PANEL_W, backgroundColor: colors.primary,
    shadowColor: '#000', shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.25, shadowRadius: 16, elevation: 16,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.base, paddingBottom: spacing.md },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  logoBox: { width: 36, height: 36, borderRadius: radius.md,
    backgroundColor: colors.primaryContainer, alignItems: 'center', justifyContent: 'center' },
  appName: { fontSize: 15, fontWeight: '700', color: colors.onPrimary },
  appRole: { fontSize: 11, color: colors.onPrimaryContainer },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center' },
  profile: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.base, paddingVertical: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.08)', marginHorizontal: spacing.md,
    borderRadius: radius.lg, marginBottom: spacing.md },
  avatarCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center' },
  profileName: { fontSize: 14, fontWeight: '600', color: colors.onPrimary },
  profileRole: { fontSize: 12, color: colors.onPrimaryContainer, marginTop: 1 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.15)',
    marginHorizontal: spacing.base, marginVertical: spacing.sm },
  scroll: { flex: 1, paddingHorizontal: spacing.sm },
  sectionLabel: { fontSize: 10, fontWeight: '700', color: colors.onPrimaryContainer,
    letterSpacing: 1, paddingHorizontal: spacing.sm, marginBottom: 4, marginTop: spacing.sm },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingVertical: 12, paddingHorizontal: spacing.sm,
    borderRadius: radius.lg, marginBottom: 2, overflow: 'hidden' },
  menuItemActive: { backgroundColor: colors.primaryContainer },
  activeBar: { position: 'absolute', left: 0, top: 8, bottom: 8, width: 3,
    backgroundColor: colors.onPrimary, borderRadius: 2 },
  menuLabel: { ...typography.bodyMd, color: colors.onPrimaryContainer, fontSize: 14 },
  menuLabelActive: { color: colors.onPrimary, fontWeight: '600' },
  menuLabelDanger: { color: colors.secondary },
  footer: { paddingHorizontal: spacing.base, paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.1)' },
  footerText: { fontSize: 11, color: colors.onPrimaryContainer },
});
