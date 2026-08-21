import React, { useMemo, useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import MapPlaceholder from '../components/MapPlaceholder';
import { colors, radius, shadow, spacing, typography } from '../constants/theme';
import { getNearbyStations, NearbyStation } from '../services/userDataService';
import { getStations } from '../services/apiService';

const STATUS_CFG = {
  available:   { bg: '#DFF2EE', text: colors.primaryContainer, dot: colors.primaryContainer, label: 'Available' },
  'high-demand': { bg: '#FFF8E1', text: colors.amber, dot: colors.amber, label: 'High Demand' },
  maintenance: { bg: '#FDECEA', text: colors.secondary, dot: colors.secondary, label: 'Maintenance' },
};

const FILTERS = ['CCS2', 'Type 2', 'Fast Charge (>50kW)'];

function StationCard({ station, onBook }: { station: NearbyStation; onBook: () => void }) {
  const cfg = STATUS_CFG[station.status];
  const canBook = station.status === 'available';

  return (
    <View style={c.card}>
      <View style={c.cardTop}>
        <Text style={c.name} numberOfLines={1}>{station.name}</Text>
        <View style={[c.statusChip, { backgroundColor: cfg.bg }]}>
          <View style={[c.statusDot, { backgroundColor: cfg.dot }]} />
          <Text style={[c.statusText, { color: cfg.text }]}>{cfg.label}</Text>
        </View>
      </View>

      <View style={c.locationRow}>
        <MaterialCommunityIcons name="map-marker-outline" size={13} color={colors.onSurfaceVariant} />
        <Text style={c.distance}>{station.distanceKm} km away</Text>
      </View>

      <View style={c.metricsRow}>
        <View style={c.metric}>
          <Text style={c.metricLabel}>SLOTS</Text>
          <Text style={c.metricValue}>{station.availableSlots}/{station.totalSlots}</Text>
        </View>
        <View style={c.metric}>
          <Text style={c.metricLabel}>SPEED</Text>
          <Text style={c.metricValue}>{station.speedKw}kW</Text>
        </View>
      </View>

      <View style={c.tagsRow}>
        {station.connectors.map(ct => (
          <View key={ct} style={c.tag}><Text style={c.tagText}>{ct}</Text></View>
        ))}
      </View>

      <TouchableOpacity
        style={[c.actionBtn, !canBook && c.actionBtnOutline]}
        onPress={canBook ? onBook : undefined}
        activeOpacity={0.85}
      >
        {canBook ? (
          <>
            <Text style={c.actionText}>Book Slot</Text>
            <MaterialCommunityIcons name="arrow-right" size={16} color={colors.onPrimary} />
          </>
        ) : (
          <Text style={[c.actionText, c.actionTextOutline]}>View Details</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

export default function StationMapScreen({ navigation }: any) {
  const [stations, setStations] = useState<NearbyStation[]>(() => getNearbyStations())

  useEffect(() => {
    getStations().then((rows: any[]) => {
      if (!rows || rows.length === 0) return
      setStations(rows.map((s: any, i: number) => ({
        id: s.station_id ?? s.id,
        name: s.station_name ?? s.name,
        city: s.city ?? '',
        location: s.location ?? '',
        availableSlots: s.availableSlots ?? 0,
        totalSlots: s.totalSlots ?? 1,
        distanceKm: parseFloat((0.8 + i * 0.5).toFixed(1)),
        speedKw: 150,
        connectors: ['CCS2'],
        status: (s.availableSlots ?? 0) > 0 ? 'available'
          : s.status === 'maintenance' ? 'maintenance' : 'high-demand',
      } as NearbyStation)))
    }).catch(() => {})
  }, [])
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar style="dark" />

      <View style={s.header}>
        <View style={s.logoRow}>
          <MaterialCommunityIcons name="lightning-bolt" size={22} color={colors.primaryContainer} />
          <Text style={s.brand}>Emerald Charge</Text>
        </View>
        <TouchableOpacity style={s.filterIconBtn}>
          <MaterialCommunityIcons name="tune-variant" size={22} color={colors.onSurface} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} stickyHeaderIndices={[0]}>
        {/* Map */}
        <MapPlaceholder />

        {/* Filter chips */}
        <View style={s.filterRow}>
          {FILTERS.map(f => {
            const active = activeFilter === f;
            return (
              <TouchableOpacity
                key={f}
                style={[s.filterChip, active && s.filterChipActive]}
                onPress={() => setActiveFilter(active ? null : f)}
              >
                {f === 'CCS2' && <MaterialCommunityIcons name="ev-station" size={13} color={active ? colors.onPrimary : colors.onSurface} />}
                {f === 'Type 2' && <MaterialCommunityIcons name="ev-station" size={13} color={active ? colors.onPrimary : colors.onSurface} />}
                {f.startsWith('Fast') && <MaterialCommunityIcons name="lightning-bolt" size={13} color={active ? colors.onPrimary : colors.onSurface} />}
                <Text style={[s.filterChipText, active && s.filterChipTextActive]}>{f}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={s.listHeader}>
          <Text style={s.listTitle}>Nearby Stations</Text>
          <Text style={s.foundCount}>{stations.length} found</Text>
        </View>

        <View style={s.stationList}>
          {stations.map(st => (
            <StationCard
              key={st.id}
              station={st}
              onBook={() => navigation.navigate('BookSession', { station: st })}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.base, paddingVertical: spacing.sm, backgroundColor: colors.background },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  brand: { fontSize: 17, fontWeight: '700', color: colors.onSurface },
  filterIconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  filterRow: { flexDirection: 'row', paddingHorizontal: spacing.base, paddingVertical: spacing.sm,
    gap: spacing.sm, backgroundColor: colors.background },
  filterChip: { flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.pill,
    backgroundColor: colors.surfaceContainerLowest, borderWidth: 1.5, borderColor: colors.outlineVariant },
  filterChipActive: { backgroundColor: colors.primaryContainer, borderColor: 'transparent' },
  filterChipText: { ...typography.labelMd, color: colors.onSurface, fontSize: 12 },
  filterChipTextActive: { color: colors.onPrimary },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.base, paddingVertical: spacing.sm },
  listTitle: { fontSize: 18, fontWeight: '700', color: colors.onSurface },
  foundCount: { ...typography.bodyMd, color: colors.onSurfaceVariant },
  stationList: { paddingHorizontal: spacing.base, paddingBottom: spacing.xl, gap: spacing.md },
});

const c = StyleSheet.create({
  card: { backgroundColor: colors.surfaceContainerLowest, borderRadius: radius.xl,
    padding: spacing.base, ...shadow.card },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  name: { fontSize: 16, fontWeight: '700', color: colors.onSurface, flex: 1, marginRight: spacing.sm },
  statusChip: { flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  statusDot: { width: 7, height: 7, borderRadius: 99 },
  statusText: { ...typography.labelMd },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: spacing.md },
  distance: { ...typography.bodySm, color: colors.onSurfaceVariant },
  metricsRow: { flexDirection: 'row', gap: spacing.xl, marginBottom: spacing.md },
  metric: {},
  metricLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5, color: colors.onSurfaceVariant, marginBottom: 2 },
  metricValue: { fontSize: 20, fontWeight: '700', color: colors.onSurface },
  tagsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.sm,
    backgroundColor: colors.surfaceContainerLow, borderWidth: 1, borderColor: colors.outlineVariant },
  tagText: { ...typography.labelSm, color: colors.onSurface },
  actionBtn: { backgroundColor: colors.primaryContainer, borderRadius: radius.xl,
    paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  actionBtnOutline: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.outlineVariant },
  actionText: { fontSize: 15, fontWeight: '700', color: colors.onPrimary },
  actionTextOutline: { color: colors.onSurface },
});
