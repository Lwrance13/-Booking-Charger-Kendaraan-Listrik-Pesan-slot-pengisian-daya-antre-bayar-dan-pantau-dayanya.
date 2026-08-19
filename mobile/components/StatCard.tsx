import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, radius, shadow, spacing, typography } from '../constants/theme';

interface StatCardProps {
  label: string;
  value: string;
  subtitle: string;
  subtitleColor?: string;
  iconName: string;
  subtitleIcon?: string;
  rightSlot?: React.ReactNode;
}

export default function StatCard({
  label,
  value,
  subtitle,
  subtitleColor = colors.onSurfaceVariant,
  iconName,
  subtitleIcon,
  rightSlot,
}: StatCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.iconBox}>
          <MaterialCommunityIcons name={iconName as any} size={20} color={colors.onSurfaceVariant} />
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.valueRow}>
          <Text style={styles.value}>{value}</Text>
          {rightSlot && <View style={styles.rightSlot}>{rightSlot}</View>}
        </View>
        <View style={styles.subtitleRow}>
          {subtitleIcon && (
            <MaterialCommunityIcons
              name={subtitleIcon as any}
              size={13}
              color={subtitleColor}
              style={{ marginRight: 3 }}
            />
          )}
          <Text style={[styles.subtitle, { color: subtitleColor }]}>{subtitle}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadow.card,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  label: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    gap: spacing.xs,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  value: {
    ...typography.headlineLg,
    color: colors.onSurface,
    lineHeight: 38,
  },
  rightSlot: {
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subtitle: {
    ...typography.bodySm,
  },
});
