import React, { useMemo, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import StatusChip from '../components/StatusChip';
import { colors, radius, shadow, spacing, typography } from '../constants/theme';
import { getStationDetails, StationDetail } from '../services/dataService';
import { useDrawer } from '../context/DrawerContext';

const BORDER: Record<string, string> = {
  online: colors.primaryContainer,
  offline: colors.secondary,
  maintenance: colors.amber,
};

function StationCard({ s }: { s: StationDetail }) {
  const border = BORDER[s.onlineStatus] ?? colors.outline;
  const chipStatus = s.onlineStatus === 'online' ? 'active'
    : s.onlineStatus === 'offline' ? 'fault' : 'maintenance';
  const slotColor = s.onlineStatus === 'offline' ? colors.secondary
    : s.slotStatusLabel === 'Reduced Cap' ? colors.amber
    : colors.primaryContainer;

  return (
    <View style={[styles.card, { borderLeftColor: border }]}>
      <View style={styles.cardTop}>
        <View style={styles.cardTopLeft}>
          <StatusChip status={chipStatus} />
          <Text style={styles.stationId}>  ID: {s.displayId}</Text>
        </View>
        <TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialCommunityIcons name="dots-vertical" size={20} color={colors.onSurfaceVariant} />
        </TouchableOpacity>
      </View>

      <Text style={styles.stationName}>{s.station_name}</Text>

      <View style={styles.locationRow}>
        <MaterialCommunityIcons name="map-marker-outline" size={13} color={colors.onSurfaceVariant} />
        <Text style={styles.locationText} numberOfLines={1}>{s.location}</Text>
      </View>

      <View style={styles.metricsRow}>
        <View style={styles.metricBox}>
          <View style={styles.metricHead}>
            <MaterialCommunityIcons name="ev-station" size={12} color={colors.onSurfaceVariant} />
            <Text style={styles.metricLabel}>Slots</Text>
          </View>
          <Text style={styles.metricVal}>
            {s.activeSlots}<Text style={styles.metricOf}> / {s.totalSlots}</Text>
          </Text>
          <Text style={[styles.metricSub, { color: slotColor }]}>{s.slotStatusLabel}</Text>
        </View>

        <View style={styles.metricBox}>
          <View style={styles.metricHead}>
            <MaterialCommunityIcons name="lightning-bolt" size={12} color={colors.onSurfaceVariant} />
            <Text style={styles.metricLabel}>Output</Text>
          </View>
          <Text style={styles.metricVal}>
            {s.currentPowerKw.toFixed(0)}<Text style={styles.metricUnit}> kW</Text>
          </Text>
          <Text style={styles.metricSub}>Current Load</Text>
        </View>
      </View>
    </View>
  );
}

export default function DashboardScreen() {
  const { open: openDrawer } = useDrawer();
  const [search, setSearch] = useState('');
  const all = useMemo(() => getStationDetails(), []);
  const filtered = useMemo(() =>
    all.filter((s) =>
      !search ||
      s.station_name.toLowerCase().includes(search.toLowerCase()) ||
      s.station_id.toLowerCase().includes(search.toLowerCase()) ||
      s.location.toLowerCase().includes(search.toLowerCase())
    ), [all, search]);

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

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.pageTitle}>Manage Stations</Text>
        <Text style={styles.pageSubtitle}>Monitor and configure charging infrastructure.</Text>

        <View style={styles.searchBox}>
          <MaterialCommunityIcons name="magnify" size={18} color={colors.outline} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search station ID or location..."
            placeholderTextColor={colors.outline}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        <TouchableOpacity style={styles.filterBtn}>
          <MaterialCommunityIcons name="filter-variant" size={16} color={colors.onSurface} />
          <Text style={styles.filterText}>Filter Status</Text>
        </TouchableOpacity>

        {filtered.map((s) => <StationCard key={s.station_id} s={s} />)}
      </ScrollView>
    </SafeAreaView>
  );
}

const CARD_BORDER = 4;
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.base, paddingVertical: spacing.sm, backgroundColor: colors.background },
  iconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  brand: { fontSize: 18, fontWeight: '700', color: colors.onSurface, letterSpacing: -0.3 },
  avatarCircle: { width: 38, height: 38, borderRadius: 19, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  content: { paddingHorizontal: spacing.base, paddingBottom: spacing.xl },
  pageTitle: { ...typography.headlineLg, fontSize: 26, color: colors.onSurface, marginBottom: 4 },
  pageSubtitle: { ...typography.bodyMd, color: colors.onSurfaceVariant, marginBottom: spacing.base },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.xl, paddingHorizontal: spacing.base, paddingVertical: 10,
    marginBottom: spacing.sm, gap: spacing.sm, ...shadow.card },
  searchInput: { flex: 1, ...typography.bodyMd, color: colors.onSurface, padding: 0 },
  filterBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.surfaceContainerLowest, borderRadius: radius.xl,
    paddingVertical: 12, gap: spacing.sm, marginBottom: spacing.base, ...shadow.card },
  filterText: { ...typography.labelLg, color: colors.onSurface },
  card: { backgroundColor: colors.surfaceContainerLowest, borderRadius: radius.xl,
    borderLeftWidth: CARD_BORDER, marginBottom: spacing.md, padding: spacing.base, ...shadow.card },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  cardTopLeft: { flexDirection: 'row', alignItems: 'center' },
  stationId: { ...typography.labelMd, color: colors.onSurfaceVariant },
  stationName: { ...typography.headlineMd, fontSize: 20, color: colors.onSurface, marginBottom: 4 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: spacing.md },
  locationText: { ...typography.bodySm, color: colors.onSurfaceVariant, flex: 1 },
  metricsRow: { flexDirection: 'row', gap: spacing.sm },
  metricBox: { flex: 1, backgroundColor: colors.surfaceContainerLow, borderRadius: radius.lg, padding: spacing.md },
  metricHead: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  metricLabel: { ...typography.labelSm, color: colors.onSurfaceVariant },
  metricVal: { fontSize: 22, fontWeight: '700', color: colors.onSurface, lineHeight: 28 },
  metricOf: { fontSize: 16, fontWeight: '400', color: colors.onSurfaceVariant },
  metricUnit: { fontSize: 14, fontWeight: '400', color: colors.onSurfaceVariant },
  metricSub: { ...typography.labelSm, color: colors.onSurfaceVariant, marginTop: 2 },
});
