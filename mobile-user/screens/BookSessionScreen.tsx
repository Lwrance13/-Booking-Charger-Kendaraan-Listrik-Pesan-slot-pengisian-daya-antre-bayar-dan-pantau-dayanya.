import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import StationImage from '../components/StationImage';
import { colors, radius, shadow, spacing, typography } from '../constants/theme';
import { getNearbyStations, setPendingBooking } from '../services/userDataService';
import { createBooking, getToken } from '../services/apiService';

const HOURS = ['08:00','09:00','10:00','11:00','12:00','13:00',
               '14:00','15:00','16:00','17:00','18:00','19:00'];
const BOOKED = new Set(['08:00','09:00','13:00','14:00','19:00']);

export default function BookSessionScreen({ navigation, route }: any) {
  const [selected, setSelected] = useState('12:00');
  const [dayOffset, setDayOffset] = useState(0);
  // Use station passed from navigation, or fall back to first nearby station
  const stations = useMemo(() => getNearbyStations(), []);
  const station = route?.params?.station ?? stations[0];

  const today = new Date();
  today.setDate(today.getDate() + dayOffset);
  const dateLabel = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const dayLabel = dayOffset === 0 ? 'Today' : dayOffset === 1 ? 'Tomorrow' : dateLabel;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar style="dark" />

      {/* Header */}
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
        <TouchableOpacity style={s.backRow} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={20} color={colors.primaryContainer} />
          <Text style={s.backText}>Back</Text>
        </TouchableOpacity>

        <Text style={s.title}>Book a Session</Text>
        <Text style={s.subtitle}>Select an available time slot below to schedule your charge.</Text>

        {/* Date picker */}
        <View style={s.datePicker}>
          <TouchableOpacity onPress={() => setDayOffset(o => Math.max(0, o - 1))} style={s.arrowBtn}>
            <MaterialCommunityIcons name="chevron-left" size={24} color={colors.onSurface} />
          </TouchableOpacity>
          <View style={{ alignItems: 'center' }}>
            <Text style={s.dateDay}>{dayLabel}</Text>
            <Text style={s.dateDate}>{dateLabel}</Text>
          </View>
          <TouchableOpacity onPress={() => setDayOffset(o => o + 1)} style={s.arrowBtn}>
            <MaterialCommunityIcons name="chevron-right" size={24} color={colors.onSurface} />
          </TouchableOpacity>
        </View>

        {/* Station card — from real JSON data */}
        <View style={s.stationCard}>
          <StationImage size="md" />
          <View style={s.stationInfo}>
            <Text style={s.stationName} numberOfLines={1}>{station?.name ?? 'SPKLU Station'}</Text>
            <View style={s.stationMeta}>
              <MaterialCommunityIcons name="ev-station" size={13} color={colors.onSurfaceVariant} />
              <Text style={s.stationMetaText}>
                {station?.connectors?.[0] ?? 'CCS2'} • {station?.speedKw ?? 150}kW
              </Text>
            </View>
          </View>
        </View>

        {/* Slots header */}
        <View style={s.slotsHeader}>
          <Text style={s.slotsTitle}>Available Slots</Text>
          <View style={s.overlapTag}>
            <MaterialCommunityIcons name="information-outline" size={13} color={colors.onSurfaceVariant} />
            <Text style={s.overlapText}>No overlap guaranteed</Text>
          </View>
        </View>

        {/* Legend */}
        <View style={s.legend}>
          {[
            { color: 'transparent', border: colors.outlineVariant, label: 'Available' },
            { color: colors.surfaceContainerHigh, border: 'transparent', label: 'Booked' },
            { color: colors.primaryContainer, border: 'transparent', label: 'Selected' },
          ].map(({ color, border, label }) => (
            <View key={label} style={s.legendItem}>
              <View style={[s.legendDot, { backgroundColor: color, borderWidth: 1.5, borderColor: border }]} />
              <Text style={s.legendText}>{label}</Text>
            </View>
          ))}
        </View>

        {/* Time grid */}
        <View style={s.grid}>
          {HOURS.map(hour => {
            const booked = BOOKED.has(hour);
            const sel = hour === selected;
            return (
              <TouchableOpacity
                key={hour}
                disabled={booked}
                onPress={() => setSelected(hour)}
                style={[
                  s.slot,
                  booked && s.slotBooked,
                  sel && s.slotSelected,
                ]}
                activeOpacity={0.75}
              >
                <Text style={[s.slotText, booked && s.slotTextBooked, sel && s.slotTextSelected]}>
                  {hour}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Confirm button */}
      <View style={s.footer}>
        <TouchableOpacity style={s.confirmBtn} activeOpacity={0.85}
          onPress={async () => {
            if (!selected) { alert('Pilih time slot dulu'); return; }
            const hourNum = parseInt(selected.split(':')[0], 10)
            const start = new Date(today)
            start.setHours(hourNum, 0, 0, 0)
            const end = new Date(start)
            end.setHours(end.getHours() + 2)
            let bookingData: any = null
            try {
              await getToken()
              const result = await createBooking({
                stationId: station?.id ?? 'ST001',
                slotId: (station?.id ?? 'ST001').replace('ST','SL'),
                startTime: start.toISOString(),
                endTime: end.toISOString(),
              })
              bookingData = {
                booking_id: result.bookingId,
                user_id: 'USR042',
                station_id: station?.id ?? 'ST001',
                station_name: station?.name ?? 'SPKLU Station',
                slot_id: (station?.id ?? 'ST001').replace('ST','SL'),
                scheduled_start: start.toISOString(),
                scheduled_end: end.toISOString(),
                status: 'confirmed',
                qr_code: result.qrCode,
                connector_type: station?.connectors?.[0] ?? 'CCS2',
                power_kw: station?.speedKw ?? 50,
              }
              setPendingBooking(bookingData)
              alert(`Booking berhasil! ✅\nID: ${result.bookingId}\nQR: ${result.qrCode}`)
            } catch {
              const demoId = `BK-DEMO-${Date.now().toString().slice(-4)}`
              bookingData = {
                booking_id: demoId,
                user_id: 'USR042',
                station_id: station?.id ?? 'ST001',
                station_name: station?.name ?? 'SPKLU Station',
                slot_id: (station?.id ?? 'ST001').replace('ST','SL'),
                scheduled_start: start.toISOString(),
                scheduled_end: end.toISOString(),
                status: 'confirmed',
                qr_code: `QR-${demoId}`,
                connector_type: station?.connectors?.[0] ?? 'CCS2',
                power_kw: station?.speedKw ?? 50,
              }
              setPendingBooking(bookingData)
              alert(`Booking berhasil (demo)! ✅\nID: ${demoId}`)
            }
            // Navigate to Bookings tab inside Main navigator
            ;(navigation as any).navigate('Main', { screen: 'Bookings' })
          }}>
          <Text style={s.confirmText}>Confirm Booking</Text>
          <MaterialCommunityIcons name="arrow-right" size={18} color={colors.onPrimary} />
        </TouchableOpacity>
      </View>
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
  content: { paddingHorizontal: spacing.base, paddingBottom: 100 },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: spacing.sm },
  backText: { ...typography.bodyMd, color: colors.primaryContainer },
  title: { fontSize: 26, fontWeight: '700', color: colors.onSurface, marginBottom: 6 },
  subtitle: { ...typography.bodyMd, color: colors.onSurfaceVariant, marginBottom: spacing.lg },
  datePicker: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.surfaceContainerLowest, borderRadius: radius.xl,
    paddingVertical: 14, paddingHorizontal: spacing.base, marginBottom: spacing.md, ...shadow.card },
  arrowBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  dateDay: { fontSize: 16, fontWeight: '700', color: colors.onSurface },
  dateDate: { ...typography.bodySm, color: colors.onSurfaceVariant },
  stationCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.surfaceContainerLowest, borderRadius: radius.xl,
    padding: spacing.base, marginBottom: spacing.lg, ...shadow.card },
  stationInfo: { flex: 1 },
  stationName: { fontSize: 16, fontWeight: '600', color: colors.onSurface, marginBottom: 4 },
  stationMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  stationMetaText: { ...typography.bodySm, color: colors.onSurfaceVariant },
  slotsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  slotsTitle: { fontSize: 18, fontWeight: '700', color: colors.onSurface },
  overlapTag: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  overlapText: { ...typography.labelSm, color: colors.onSurfaceVariant },
  legend: { flexDirection: 'row', gap: spacing.lg, marginBottom: spacing.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 16, height: 16, borderRadius: 8 },
  legendText: { ...typography.bodySm, color: colors.onSurfaceVariant },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  slot: { width: '22.5%', paddingVertical: 14, borderRadius: radius.lg, alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest, borderWidth: 1.5, borderColor: colors.outlineVariant },
  slotBooked: { backgroundColor: colors.surfaceContainerHigh, borderColor: 'transparent' },
  slotSelected: { backgroundColor: colors.primaryContainer, borderColor: 'transparent' },
  slotText: { fontSize: 14, fontWeight: '600', color: colors.onSurface },
  slotTextBooked: { color: colors.outline },
  slotTextSelected: { color: colors.onPrimary },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: spacing.base, paddingBottom: spacing.lg, paddingTop: spacing.sm,
    backgroundColor: colors.background },
  confirmBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.primaryContainer, borderRadius: radius.full,
    paddingVertical: 18, gap: spacing.sm },
  confirmText: { fontSize: 16, fontWeight: '700', color: colors.onPrimary },
});
