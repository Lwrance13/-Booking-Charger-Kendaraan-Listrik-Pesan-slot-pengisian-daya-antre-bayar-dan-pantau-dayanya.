import React, { useMemo, useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import StatusChip from '../components/StatusChip';
import StationImage from '../components/StationImage';
import { colors, radius, shadow, spacing, typography } from '../constants/theme';
import {
  getUserBalance, getNextBooking, getNearbyStations, NearbyStation,
} from '../services/userDataService';
import { getStations, getToken } from '../services/apiService';

function StationCard({ s, onBook }: { s: NearbyStation; onBook: () => void }) {
  const isFast = s.speedKw >= 50;
  return (
    <TouchableOpacity style={sc.card} onPress={onBook} activeOpacity={0.8}>
      <StationImage size="md" />
      <View style={sc.info}>
        <Text style={sc.name} numberOfLines={1}>{s.name}</Text>
        <View style={sc.tagsRow}>
          <View style={[sc.tag, isFast ? sc.tagFast : sc.tagStd]}>
            <MaterialCommunityIcons
              name={isFast ? 'lightning-bolt' : 'ev-station'}
              size={11}
              color={isFast ? colors.primaryContainer : colors.onSurfaceVariant}
            />
            <Text style={[sc.tagText, isFast ? sc.tagTextFast : sc.tagTextStd]}>
              {isFast ? 'Fast' : 'Standard'}
            </Text>
          </View>
          <Text style={sc.avail}>{s.availableSlots}/{s.totalSlots} Available</Text>
        </View>
      </View>
      <Text style={sc.dist}>{s.distanceKm} km</Text>
    </TouchableOpacity>
  );
}

export default function HomeScreen({ navigation }: any) {
  const balance = useMemo(() => getUserBalance(), []);
  const nextBooking = useMemo(() => getNextBooking(), []);
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
        distanceKm: parseFloat((0.8 + i * 0.4).toFixed(1)),
        speedKw: s.tariffPerKwh ? 150 : 50,
        connectors: ['CCS2', 'Type 2'],
        status: (s.availableSlots ?? 0) > 0 ? 'available' : 'high-demand',
      } as NearbyStation)))
    }).catch(() => {/* keep local data */})
  }, [])

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <View style={styles.logoRow}>
          <MaterialCommunityIcons name="lightning-bolt" size={22} color={colors.primaryContainer} />
          <Text style={styles.brand}>Emerald Charge</Text>
        </View>
        <TouchableOpacity style={styles.bellBtn}>
          <MaterialCommunityIcons name="bell-outline" size={22} color={colors.onSurface} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={styles.welcome}>Welcome back, Sarah</Text>
        <Text style={styles.subtitle}>Ready to power up your journey today?</Text>

        <View style={styles.balanceCard}>
          <View style={styles.balanceTop}>
            <View>
              <Text style={styles.balanceLabel}>CURRENT BALANCE</Text>
              <Text style={styles.balanceAmount}>${balance.toFixed(2)}</Text>
            </View>
            <TouchableOpacity style={styles.addBtn}>
              <MaterialCommunityIcons name="plus" size={20} color={colors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.bookBtn} activeOpacity={0.85}
            onPress={() => navigation.navigate('BookSession', { station: stations[0] })}>
            <MaterialCommunityIcons name="ev-station" size={18} color={colors.onPrimary} />
            <Text style={styles.bookBtnText}>Book a Slot Now</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Next Booking</Text>
        {nextBooking ? (
          <View style={[styles.bookingCard, { borderLeftColor: colors.amber }]}>
            <View style={styles.bookingIconBox}>
              <MaterialCommunityIcons name="clock-outline" size={22} color={colors.primaryContainer} />
            </View>
            <View style={styles.bookingInfo}>
              <Text style={styles.bookingStation} numberOfLines={1}>{nextBooking.stationName}</Text>
              <Text style={styles.bookingTime} numberOfLines={1}>{nextBooking.timeLabel}</Text>
            </View>
            <StatusChip status={nextBooking.status === 'confirmed' ? 'upcoming' : nextBooking.status} />
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No upcoming bookings</Text>
          </View>
        )}

        <View style={styles.nearbyHeader}>
          <Text style={styles.sectionTitle}>Nearby Stations</Text>
          <TouchableOpacity onPress={() => navigation.navigate('StationMap')}>
            <Text style={styles.viewMap}>View Map</Text>
          </TouchableOpacity>
        </View>
        {stations.slice(0, 4).map(s => (
          <StationCard key={s.id} s={s}
            onBook={() => navigation.navigate('BookSession', { station: s })} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.base, paddingVertical: spacing.md },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  brand: { fontSize: 17, fontWeight: '700', color: colors.onSurface },
  bellBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: spacing.base, paddingBottom: spacing.xl },
  welcome: { fontSize: 30, fontWeight: '700', color: colors.onSurface, marginBottom: 6 },
  subtitle: { ...typography.bodyMd, color: colors.onSurfaceVariant, marginBottom: spacing.lg },
  balanceCard: { backgroundColor: colors.surfaceContainerLowest, borderRadius: radius.xl,
    padding: spacing.lg, marginBottom: spacing.lg, ...shadow.card },
  balanceTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.lg },
  balanceLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 1, color: colors.onSurfaceVariant, marginBottom: 4 },
  balanceAmount: { fontSize: 36, fontWeight: '700', color: colors.onSurface },
  addBtn: { width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.surfaceContainerLow, alignItems: 'center', justifyContent: 'center' },
  bookBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.primaryContainer, borderRadius: radius.lg, paddingVertical: 16, gap: spacing.sm },
  bookBtnText: { ...typography.labelLg, color: colors.onPrimary, fontSize: 16 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: colors.onSurface, marginBottom: spacing.md },
  bookingCard: { backgroundColor: colors.surfaceContainerLowest, borderRadius: radius.xl,
    borderLeftWidth: 4, flexDirection: 'row', alignItems: 'center',
    padding: spacing.base, gap: spacing.md, marginBottom: spacing.lg, ...shadow.card },
  bookingIconBox: { width: 48, height: 48, borderRadius: radius.md,
    backgroundColor: colors.surfaceContainerLow, alignItems: 'center', justifyContent: 'center' },
  bookingInfo: { flex: 1 },
  bookingStation: { ...typography.labelLg, color: colors.onSurface, fontSize: 14 },
  bookingTime: { ...typography.bodySm, color: colors.onSurfaceVariant, marginTop: 2 },
  emptyCard: { backgroundColor: colors.surfaceContainerLowest, borderRadius: radius.xl,
    padding: spacing.lg, alignItems: 'center', marginBottom: spacing.lg },
  emptyText: { ...typography.bodyMd, color: colors.onSurfaceVariant },
  nearbyHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  viewMap: { ...typography.bodyMd, color: colors.primaryContainer, fontWeight: '500' },
});

const sc = StyleSheet.create({
  card: { backgroundColor: colors.surfaceContainerLowest, borderRadius: radius.xl,
    flexDirection: 'row', alignItems: 'center', padding: spacing.base,
    marginBottom: spacing.sm, gap: spacing.md, ...shadow.card },
  info: { flex: 1 },
  name: { ...typography.labelLg, color: colors.onSurface, fontSize: 15, marginBottom: 6 },
  tagsRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
  tagFast: { backgroundColor: '#DFF2EE' },
  tagStd: { backgroundColor: colors.surfaceContainerLow },
  tagText: { ...typography.labelSm },
  tagTextFast: { color: colors.primaryContainer },
  tagTextStd: { color: colors.onSurfaceVariant },
  avail: { ...typography.labelSm, color: colors.onSurfaceVariant },
  dist: { ...typography.labelMd, color: colors.onSurfaceVariant, minWidth: 40, textAlign: 'right' },
});
