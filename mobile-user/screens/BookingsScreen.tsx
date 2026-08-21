import React, { useMemo, useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, radius, shadow, spacing, typography } from '../constants/theme';
import { getMyBookings, getToken, startSession } from '../services/apiService';
import { getActiveBooking, getPastSessions, PastSession, clearPendingBooking } from '../services/userDataService';

function ActiveReservationCard({ booking }: { booking: any }) {
  const start = new Date(booking.scheduled_start);
  const startLabel = start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  return (
    <View style={a.card}>
      <View style={a.cardTop}>
        <View style={a.confirmedChip}>
          <Text style={a.confirmedText}>CONFIRMED</Text>
        </View>
        <View style={a.timerBox}>
          <Text style={a.timerLabel}>STARTS IN</Text>
          <Text style={a.timerValue}>14:57</Text>
        </View>
      </View>

      <Text style={a.stationName}>{booking.station_name ?? booking.station_id ?? 'Stasiun EV'}</Text>
      <View style={a.locationRow}>
        <MaterialCommunityIcons name="map-marker-outline" size={14} color={colors.onSurfaceVariant} />
        <Text style={a.locationText}>{booking.connector_type ? `${booking.connector_type} - ${booking.power_kw}kW` : booking.slot_id ?? 'Lihat detail'}</Text>
      </View>

      {/* Auto-release warning */}
      <View style={a.warningBanner}>
        <MaterialCommunityIcons name="alert-outline" size={16} color={colors.secondary} />
        <View style={{ flex: 1 }}>
          <Text style={a.warningTitle}>Auto-Release Policy Active</Text>
          <Text style={a.warningBody}>
            Reservation will be released if not checked-in within 15 minutes of start time.
          </Text>
        </View>
      </View>

      {/* Metrics */}
      <View style={a.metricsRow}>
        <View style={a.metric}>
          <Text style={a.metricLabel}>Scheduled Start</Text>
          <Text style={a.metricValue}>{startLabel}</Text>
        </View>
        <View style={[a.metric, a.metricBorder]}>
          <Text style={a.metricLabel}>Connector Type</Text>
          <Text style={a.metricValue}>CCS2 - 150kW</Text>
        </View>
      </View>

      {/* Action buttons */}
      <View style={a.btnRow}>
        <TouchableOpacity style={a.checkInBtn}
          onPress={async () => {
            try {
              await getToken()
              const session = await startSession(booking.booking_id)
              clearPendingBooking()
              alert(`Sesi pengisian dimulai! ✅\nSession ID: ${session.sessionId}\nMeter Start: ${(session.meterStart ?? 0).toFixed(2)} kWh\n\nMonitor di WebSocket: ws://:8003/ws/${session.sessionId}`)
            } catch (e: any) {
              if (e.message?.includes('Network') || e.message?.includes('fetch')) {
                alert('Check-In (demo mode) ✅\n\nSimulasi sesi dimulai.\n(Hubungkan ke backend untuk sesi nyata.)')
                clearPendingBooking()
              } else {
                alert(`Check-In gagal: ${e.message || 'Cek koneksi'}`)
              }
            }
          }}>
          <MaterialCommunityIcons name="qrcode-scan" size={18} color={colors.onPrimary} />
          <Text style={a.checkInText}>Check-In</Text>
        </TouchableOpacity>
        <TouchableOpacity style={a.moreBtn}
          onPress={async () => {
            const opts = ['Lihat Detail', 'Batalkan Booking', 'Tutup']
            // Simple action sheet via alert for native
            alert(`Booking: ${booking.booking_id}\nStatus: ${booking.status}\nStation: ${booking.station_id}`)
          }}>
          <MaterialCommunityIcons name="dots-horizontal" size={20} color={colors.onSurface} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function PastSessionRow({ session }: { session: PastSession }) {
  if (session.autoReleased) {
    return (
      <View style={p.row}>
        <View style={[p.iconBox, { backgroundColor: colors.chipOfflineBg }]}>
          <MaterialCommunityIcons name="calendar-remove" size={20} color={colors.secondary} />
        </View>
        <View style={p.info}>
          <Text style={[p.name, p.nameStrike]}>{session.stationName}</Text>
          <Text style={p.autoReleased}>Auto-Released</Text>
        </View>
        <View style={p.right}>
          <Text style={p.dash}>--</Text>
          <Text style={p.date}>{session.dateLabel}</Text>
        </View>
      </View>
    );
  }
  return (
    <View style={p.row}>
      <View style={p.iconBox}>
        <MaterialCommunityIcons name="ev-station" size={20} color={colors.primaryContainer} />
      </View>
      <View style={p.info}>
        <Text style={p.name}>{session.stationName}</Text>
        <Text style={p.date}>{session.dateLabel}</Text>
      </View>
      <View style={p.right}>
        <Text style={p.kwh}>{session.kwhUsed} kWh</Text>
        <Text style={p.cost}>${session.costUsd.toFixed(2)}</Text>
      </View>
    </View>
  );
}

export default function BookingsScreen({ navigation }: any) {
  const [active, setActive] = useState<any>(() => getActiveBooking())
  // Refresh active booking from API (gets newly created bookings from DB)
  useEffect(() => {
    getToken().then(() => getMyBookings()).then((rows: any[]) => {
      if (!rows || rows.length === 0) return
      const confirmed = rows.find(b => b.status === 'confirmed' || b.status === 'pending')
      if (confirmed) setActive(confirmed)
    }).catch(() => {})
  }, [])
  const past = useMemo(() => getPastSessions(), []);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar style="dark" />

      <View style={s.header}>
        <View style={s.logoRow}>
          <MaterialCommunityIcons name="lightning-bolt" size={22} color={colors.primaryContainer} />
          <Text style={s.brand}>Emerald Charge</Text>
        </View>
        <TouchableOpacity style={s.bellBtn}>
          <MaterialCommunityIcons name="bell-outline" size={22} color={colors.onSurface} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        <Text style={s.title}>Your Bookings</Text>
        <Text style={s.subtitle}>Manage your upcoming and past charging sessions.</Text>

        <Text style={s.sectionLabel}>ACTIVE RESERVATION</Text>
        {active
          ? <ActiveReservationCard booking={active} />
          : (
            <View style={s.emptyCard}>
              <MaterialCommunityIcons name="calendar-check" size={32} color={colors.outlineVariant} />
              <Text style={s.emptyText}>No active reservations</Text>
            </View>
          )
        }

        <Text style={s.sectionLabel}>PAST SESSIONS</Text>
        <View style={s.pastCard}>
          {past.map((session, i) => (
            <View key={session.id}>
              <PastSessionRow session={session} />
              {i < past.length - 1 && <View style={s.divider} />}
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.base, paddingVertical: spacing.sm },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  brand: { fontSize: 17, fontWeight: '700', color: colors.onSurface },
  bellBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: spacing.base, paddingBottom: spacing.xl },
  title: { fontSize: 26, fontWeight: '700', color: colors.onSurface, marginBottom: 4 },
  subtitle: { ...typography.bodyMd, color: colors.onSurfaceVariant, marginBottom: spacing.lg },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2,
    color: colors.onSurfaceVariant, marginBottom: spacing.sm, marginTop: spacing.sm },
  emptyCard: { backgroundColor: colors.surfaceContainerLowest, borderRadius: radius.xl,
    padding: spacing.xl, alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  emptyText: { ...typography.bodyMd, color: colors.onSurfaceVariant },
  pastCard: { backgroundColor: colors.surfaceContainerLowest, borderRadius: radius.xl,
    ...shadow.card, overflow: 'hidden' },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.outlineVariant,
    marginLeft: 72 },
});

const a = StyleSheet.create({
  card: { backgroundColor: colors.surfaceContainerLowest, borderRadius: radius.xl,
    padding: spacing.base, marginBottom: spacing.md, ...shadow.card },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  confirmedChip: { backgroundColor: colors.surfaceContainerLow, paddingHorizontal: 10,
    paddingVertical: 4, borderRadius: radius.pill },
  confirmedText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, color: colors.onSurfaceVariant },
  timerBox: { backgroundColor: '#FFF8E1', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: radius.md, alignItems: 'center' },
  timerLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5, color: colors.amber },
  timerValue: { fontSize: 20, fontWeight: '700', color: colors.amber },
  stationName: { fontSize: 20, fontWeight: '700', color: colors.onSurface, marginBottom: 4 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: spacing.md },
  locationText: { ...typography.bodySm, color: colors.onSurfaceVariant },
  warningBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm,
    backgroundColor: '#FDECEA', borderRadius: radius.md, padding: spacing.md,
    borderLeftWidth: 3, borderLeftColor: colors.secondary, marginBottom: spacing.md },
  warningTitle: { fontSize: 13, fontWeight: '700', color: colors.secondary, marginBottom: 2 },
  warningBody: { ...typography.bodySm, color: colors.secondary, lineHeight: 18 },
  metricsRow: { flexDirection: 'row', marginBottom: spacing.md },
  metric: { flex: 1 },
  metricBorder: { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: colors.outlineVariant, paddingLeft: spacing.base },
  metricLabel: { ...typography.labelSm, color: colors.onSurfaceVariant, marginBottom: 2 },
  metricValue: { fontSize: 15, fontWeight: '600', color: colors.onSurface },
  btnRow: { flexDirection: 'row', gap: spacing.sm },
  checkInBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.primaryContainer, borderRadius: radius.xl, paddingVertical: 14, gap: 8 },
  checkInText: { fontSize: 15, fontWeight: '700', color: colors.onPrimary },
  moreBtn: { width: 48, height: 48, borderRadius: radius.xl, borderWidth: 1.5,
    borderColor: colors.outlineVariant, alignItems: 'center', justifyContent: 'center' },
});

const p = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', padding: spacing.base, gap: spacing.md },
  iconBox: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#DFF2EE',
    alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1 },
  name: { fontSize: 14, fontWeight: '600', color: colors.onSurface },
  nameStrike: { textDecorationLine: 'line-through', color: colors.onSurfaceVariant },
  date: { ...typography.labelSm, color: colors.onSurfaceVariant, marginTop: 2 },
  autoReleased: { ...typography.labelSm, color: colors.secondary, marginTop: 2 },
  right: { alignItems: 'flex-end' },
  kwh: { fontSize: 15, fontWeight: '700', color: colors.onSurface },
  cost: { ...typography.bodySm, color: colors.onSurfaceVariant, marginTop: 2 },
  dash: { fontSize: 18, fontWeight: '700', color: colors.onSurfaceVariant },
});
