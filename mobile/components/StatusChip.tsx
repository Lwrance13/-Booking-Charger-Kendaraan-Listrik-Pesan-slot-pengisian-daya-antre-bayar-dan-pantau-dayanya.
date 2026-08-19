import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, radius, typography } from '../constants/theme';

type StatusType =
  | 'online' | 'offline' | 'maintenance'
  | 'available' | 'occupied' | 'reserved'
  | 'active' | 'charging' | 'fault' | 'reduced-cap' | 'inactive';

const STATUS_CONFIG: Record<StatusType, { bg: string; text: string; dot?: string; label: string; icon?: string }> = {
  online:        { bg: colors.chipOnlineBg,         text: colors.chipOnlineText,       dot: colors.chipOnlineText,    label: 'Online' },
  active:        { bg: colors.chipOnlineBg,         text: colors.chipOnlineText,       dot: colors.chipOnlineText,    label: 'Active' },
  offline:       { bg: colors.chipOfflineBg,        text: colors.chipOfflineText,      dot: colors.chipOfflineText,   label: 'Offline' },
  fault:         { bg: colors.chipOfflineBg,        text: colors.chipOfflineText,      icon: 'alert-circle-outline',  label: 'Fault Detected' },
  maintenance:   { bg: colors.chipMaintenanceBg,    text: colors.chipMaintenanceText,  dot: colors.amber,             label: 'Maintenance' },
  available:     { bg: colors.chipAvailableBg,      text: colors.chipAvailableText,    dot: colors.chipAvailableText, label: 'Available' },
  occupied:      { bg: colors.chipOfflineBg,        text: colors.chipOfflineText,      dot: colors.chipOfflineText,   label: 'Occupied' },
  reserved:      { bg: colors.chipReservedBg,       text: colors.chipReservedText,     dot: colors.chipReservedText,  label: 'Reserved' },
  charging:      { bg: colors.chipOnlineBg,         text: colors.chipOnlineText,       icon: 'power-plug-outline',    label: 'Charging' },
  'reduced-cap': { bg: colors.chipMaintenanceBg,    text: colors.chipMaintenanceText,  dot: colors.amber,             label: 'Reduced Cap' },
  inactive:      { bg: colors.surfaceContainerHigh, text: colors.onSurfaceVariant,     dot: colors.outline,           label: 'Inactive' },
};

export default function StatusChip({ status }: { status: string }) {
  const key = status.toLowerCase().replace(/\s+/g, '-') as StatusType;
  const config = STATUS_CONFIG[key] ?? STATUS_CONFIG.offline;

  return (
    <View style={[styles.chip, { backgroundColor: config.bg }]}>
      {config.icon
        ? <MaterialCommunityIcons name={config.icon as any} size={11} color={config.text} />
        : <View style={[styles.dot, { backgroundColor: config.dot ?? config.text }]} />}
      <Text style={[styles.label, { color: config.text }]}>{config.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    gap: 4,
  },
  dot: { width: 7, height: 7, borderRadius: radius.full },
  label: { ...typography.labelMd },
});
