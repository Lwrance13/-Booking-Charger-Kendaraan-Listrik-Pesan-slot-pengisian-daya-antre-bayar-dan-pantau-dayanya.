import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, radius, shadow, spacing, typography } from '../constants/theme';
import { getAllSessions } from '../services/dataService';
import { useDrawer } from '../context/DrawerContext';

export default function PowerScreen() {
  const { open: openDrawer } = useDrawer();
  const sessions = useMemo(() => getAllSessions(), []);
  const totalKwh = useMemo(
    () => sessions.reduce((s, r) => s + (r.energy_kwh ?? 0), 0).toFixed(1),
    [sessions],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Power</Text>
        <Text style={styles.subtitle}>Total energy delivered</Text>
      </View>

      <View style={styles.summaryCard}>
        <MaterialCommunityIcons name="lightning-bolt" size={28} color={colors.amber} />
        <Text style={styles.totalKwh}>{totalKwh} kWh</Text>
        <Text style={styles.summaryLabel}>across {sessions.length} sessions</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {sessions.map((s) => (
          <View key={s.session_id} style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.sessionId}>{s.session_id}</Text>
              <Text style={styles.kwh}>{s.energy_kwh} kWh</Text>
            </View>
            <Text style={styles.meta}>
              {s.slot_id} · {s.duration_min} min · max {s.max_power_kw} kW
            </Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.base, paddingTop: spacing.base, paddingBottom: spacing.sm },
  title: { ...typography.headlineMd, color: colors.onSurface },
  subtitle: { ...typography.bodySm, color: colors.onSurfaceVariant, marginTop: 2 },
  summaryCard: {
    backgroundColor: colors.primaryContainer,
    margin: spacing.base,
    borderRadius: radius.xl,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.xs,
  },
  totalKwh: { fontSize: 32, fontWeight: '700', color: colors.onPrimary },
  summaryLabel: { ...typography.bodySm, color: colors.onPrimaryContainer },
  content: { paddingHorizontal: spacing.base, paddingBottom: spacing.xl, gap: spacing.sm },
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    padding: spacing.base,
    ...shadow.card,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  sessionId: { ...typography.labelLg, color: colors.onSurface },
  kwh: { ...typography.labelLg, color: colors.primaryContainer },
  meta: { ...typography.bodySm, color: colors.onSurfaceVariant },
});
