import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius, spacing, typography } from '../constants/theme';

interface RevenueCardProps {
  totalRevenue: string;
  avgSession: string;
  transactions: number;
}

export default function RevenueCard({ totalRevenue, avgSession, transactions }: RevenueCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>Today's Revenue</Text>
      <Text style={styles.amount}>{totalRevenue}</Text>

      <View style={styles.row}>
        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>AVG SESSION</Text>
          <Text style={styles.metricValue}>{avgSession}</Text>
        </View>
        <View style={[styles.metricBox, styles.metricBoxRight]}>
          <Text style={styles.metricLabel}>TRANSACTIONS</Text>
          <Text style={styles.metricValue}>{transactions}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.primaryContainer,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  label: {
    ...typography.bodySm,
    color: colors.onPrimaryContainer,
    marginBottom: spacing.xs,
  },
  amount: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.onPrimary,
    lineHeight: 44,
    marginBottom: spacing.base,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  metricBox: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderRadius: radius.md,
    padding: spacing.md,
  },
  metricBoxRight: {},
  metricLabel: {
    ...typography.labelSm,
    color: colors.onPrimaryContainer,
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  metricValue: {
    ...typography.headlineMd,
    color: colors.onPrimary,
    fontSize: 18,
    lineHeight: 24,
  },
});
