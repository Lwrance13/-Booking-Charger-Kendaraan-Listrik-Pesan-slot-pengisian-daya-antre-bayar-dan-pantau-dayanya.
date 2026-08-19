import React, { useMemo, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import StatusChip from '../components/StatusChip';
import { colors, radius, shadow, spacing, typography } from '../constants/theme';
import { getSlotDetails, getMeterBars, SlotDetail } from '../services/dataService';
import { useDrawer } from '../context/DrawerContext';

const BORDER: Record<string, string> = {
  available: colors.primaryContainer,
  occupied:  colors.primaryContainer,
  charging:  colors.primaryContainer,
  reserved:  colors.chipReservedText,
  maintenance: colors.secondary,
};

function BarChart() {
  const bars = useMemo(() => getMeterBars(), []);
  const totalCap = 1200;
  const used = Math.round(totalCap * 0.7);
  const avail = totalCap - used;

  return (
    <View style={bStyles.card}>
      <View style={bStyles.headerRow}>
        <View style={bStyles.titleRow}>
          <MaterialCommunityIcons name="lightning-bolt" size={18} color={colors.onSurface} />
          <Text style={bStyles.title}>Real-time Power{`\n`}Distribution</Text>
        </View>
        <View style={bStyles.legend}>
          <View style={bStyles.legendItem}>
            <View style={[bStyles.legendDot, { backgroundColor: colors.primaryContainer }]} />
            <Text style={bStyles.legendText}>Used{`\n`}Power</Text>
          </View>
          <View style={bStyles.legendItem}>
            <View style={[bStyles.legendDot, { backgroundColor: colors.surfaceContainerHigh }]} />
            <Text style={bStyles.legendText}>Available</Text>
          </View>
        </View>
      </View>

      <View style={bStyles.chart}>
        {bars.map((h, i) => (
          <View key={i} style={bStyles.barCol}>
            <View style={bStyles.barTrack}>
              <View style={[bStyles.barFill, {
                height: `${Math.round(h * 100)}%`,
                backgroundColor: i % 2 === 0 ? colors.primaryContainer : colors.surfaceContainerHigh,
              }]} />
            </View>
          </View>
        ))}
      </View>

      <View style={bStyles.statsRow}>
        <View style={bStyles.statItem}>
          <Text style={bStyles.statLabel}>Total Capacity</Text>
          <Text style={bStyles.statValue}>{totalCap.toLocaleString()}</Text>
          <Text style={bStyles.statUnit}>kW</Text>
        </View>
        <View style={bStyles.statItem}>
          <Text style={bStyles.statLabel}>Current Usage</Text>
          <Text style={bStyles.statValue}>{used} <Text style={bStyles.statUnit}>kw</Text></Text>
        </View>
        <View style={bStyles.statItem}>
          <Text style={bStyles.statLabel}>Available Power</Text>
          <Text style={bStyles.statValue}>{avail} <Text style={bStyles.statUnit}>kW</Text></Text>
        </View>
      </View>
    </View>
  );
}

function SlotCard({ slot, enabled, onToggle }: {
  slot: SlotDetail; enabled: boolean; onToggle: (v: boolean) => void;
}) {
  const border = BORDER[slot.slot_status] ?? colors.outline;
  const isCharging = slot.slot_status === 'occupied';
  const isMaintenance = slot.slot_status === 'maintenance';
  const isAvailable = slot.slot_status === 'available';
  const chipStatus = isCharging ? 'charging' : isAvailable ? 'available' : 'maintenance';
  const num = slot.slot_id.replace('SL', '').padStart(2, '0');

  return (
    <View style={[sStyles.card, { borderLeftColor: border }]}>
      <View style={sStyles.cardTop}>
        <View>
          <Text style={sStyles.slotName}>Slot {num}</Text>
          <Text style={sStyles.slotMeta}>{slot.connector_type} - {slot.power_kw}kW</Text>
        </View>
        <StatusChip status={chipStatus} />
      </View>

      {isCharging && (
        <View style={sStyles.outputRow}>
          <Text style={sStyles.outputLabel}>Output</Text>
          <View style={sStyles.progressTrack}>
            <View style={[sStyles.progressFill, { width: `${Math.round(slot.outputPct * 100)}%` }]} />
          </View>
          <Text style={sStyles.outputKw}>{slot.currentOutputKw} kW</Text>
        </View>
      )}

      {isAvailable && (
        <Text style={sStyles.availableText}>Ready to connect. No active session.</Text>
      )}

      {isMaintenance && (
        <Text style={sStyles.faultText}>{slot.errorMessage}</Text>
      )}

      <View style={sStyles.toggleRow}>
        <Text style={sStyles.toggleLabel}>Enable Slot</Text>
        <Switch
          value={enabled}
          onValueChange={onToggle}
          disabled={isMaintenance}
          trackColor={{ false: colors.surfaceContainerHigh, true: '#1a73e8' }}
          thumbColor={colors.white}
        />
      </View>
    </View>
  );
}

export default function SlotsScreen() {
  const { open: openDrawer } = useDrawer();
  const slots = useMemo(() => getSlotDetails(), []);
  const [enabled, setEnabled] = useState<Record<string, boolean>>(
    Object.fromEntries(slots.map((s) => [s.slot_id, s.slot_status !== 'maintenance']))
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={openDrawer}>
          <MaterialCommunityIcons name="menu" size={24} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.brand}>Emerald Charge</Text>
        <View style={styles.avatarCircle}>
          <MaterialCommunityIcons name="account-circle" size={38} color={colors.primaryContainer} />
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={styles.pageTitle}>Slots & Power</Text>
        <View style={styles.locationRow}>
          <MaterialCommunityIcons name="map-marker-outline" size={14} color={colors.onSurfaceVariant} />
          <Text style={styles.locationText}>Station Alpha - Downtown Hub</Text>
        </View>

        <TouchableOpacity style={styles.syncBtn}>
          <MaterialCommunityIcons name="sync" size={15} color={colors.onSurface} />
          <Text style={styles.syncText}>Sync Data</Text>
        </TouchableOpacity>

        <BarChart />

        <Text style={styles.sectionTitle}>Slot Status & Controls</Text>

        {slots.map((slot) => (
          <SlotCard
            key={slot.slot_id}
            slot={slot}
            enabled={enabled[slot.slot_id] ?? true}
            onToggle={(v) => setEnabled((prev) => ({ ...prev, [slot.slot_id]: v }))}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.base, paddingVertical: spacing.sm },
  iconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  brand: { fontSize: 18, fontWeight: '700', color: colors.onSurface },
  avatarCircle: { width: 38, height: 38, borderRadius: 19, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: spacing.base, paddingBottom: spacing.xl },
  pageTitle: { ...typography.headlineLg, fontSize: 24, color: colors.onSurface, marginBottom: 2 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: spacing.md },
  locationText: { ...typography.bodySm, color: colors.onSurfaceVariant },
  syncBtn: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
    backgroundColor: colors.surfaceContainerLowest, borderRadius: radius.xl,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: 6,
    marginBottom: spacing.md, ...shadow.card },
  syncText: { ...typography.labelLg, color: colors.onSurface },
  sectionTitle: { ...typography.labelLg, color: colors.onSurface, marginTop: spacing.lg, marginBottom: spacing.md, fontSize: 15 },
});

const bStyles = StyleSheet.create({
  card: { backgroundColor: colors.surfaceContainerLowest, borderRadius: radius.xl,
    padding: spacing.base, marginBottom: spacing.sm, ...shadow.card },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.md },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, flex: 1 },
  title: { ...typography.labelLg, color: colors.onSurface, fontSize: 13, lineHeight: 18 },
  legend: { flexDirection: 'row', gap: spacing.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { ...typography.labelSm, color: colors.onSurfaceVariant, lineHeight: 14 },
  chart: { flexDirection: 'row', alignItems: 'flex-end', height: 80, gap: 5, marginBottom: spacing.md },
  barCol: { flex: 1 },
  barTrack: { height: 80, backgroundColor: colors.surfaceContainerLow, borderRadius: 4, overflow: 'hidden', justifyContent: 'flex-end' },
  barFill: { width: '100%', borderRadius: 4 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.outlineVariant },
  statItem: { flex: 1 },
  statLabel: { ...typography.labelSm, color: colors.onSurfaceVariant, marginBottom: 2 },
  statValue: { fontSize: 18, fontWeight: '700', color: colors.onSurface },
  statUnit: { fontSize: 12, fontWeight: '400', color: colors.onSurfaceVariant },
});

const sStyles = StyleSheet.create({
  card: { backgroundColor: colors.surfaceContainerLowest, borderRadius: radius.xl,
    borderLeftWidth: 4, padding: spacing.base, marginBottom: spacing.md, ...shadow.card },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  slotName: { ...typography.headlineMd, fontSize: 18, color: colors.onSurface },
  slotMeta: { ...typography.bodySm, color: colors.onSurfaceVariant, marginTop: 2 },
  outputRow: { marginTop: spacing.sm, marginBottom: spacing.sm },
  outputLabel: { ...typography.labelSm, color: colors.onSurfaceVariant, marginBottom: 4 },
  progressTrack: { height: 6, backgroundColor: colors.surfaceContainerHigh, borderRadius: 3, overflow: 'hidden', marginBottom: 4 },
  progressFill: { height: '100%', backgroundColor: colors.onSurface, borderRadius: 3 },
  outputKw: { ...typography.labelLg, color: colors.onSurface, alignSelf: 'flex-end' },
  availableText: { ...typography.bodySm, color: colors.onSurfaceVariant, marginVertical: spacing.sm },
  faultText: { ...typography.bodySm, color: colors.secondary, marginVertical: spacing.sm },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: spacing.sm, paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.outlineVariant },
  toggleLabel: { ...typography.bodyMd, color: colors.onSurface },
});
