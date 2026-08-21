import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import VehicleImage from '../components/VehicleImage';
import { colors, radius, shadow, spacing, typography } from '../constants/theme';
import { getUserVehicles, Vehicle } from '../services/userDataService';

function VehicleCard({ v, onBook }: { v: Vehicle; onBook: () => void }) {
  return (
    <View style={s.card}>
      {/* Full-width car showcase banner */}
      <VehicleImage brand={v.brand} model={v.model} color={v.color} variant="banner" />

      <View style={s.infoRow}>
        <View style={s.info}>
          <Text style={s.model}>{v.brand} {v.model}</Text>
          <View style={s.plateRow}>
            <MaterialCommunityIcons name="card-account-details-outline" size={13} color={colors.onSurfaceVariant} />
            <Text style={s.plate}>{v.plate}</Text>
          </View>
        </View>
        <TouchableOpacity style={s.moreBtn}>
          <MaterialCommunityIcons name="dots-vertical" size={20} color={colors.onSurfaceVariant} />
        </TouchableOpacity>
      </View>

      <View style={s.specsRow}>
        <View style={s.spec}>
          <MaterialCommunityIcons name="lightning-bolt" size={14} color={colors.primaryContainer} />
          <Text style={s.specLabel}>Battery</Text>
          <Text style={s.specValue}>{v.batteryKwh} kWh</Text>
        </View>
        <View style={s.specDivider} />
        <View style={s.spec}>
          <MaterialCommunityIcons name="power-plug-outline" size={14} color={colors.primaryContainer} />
          <Text style={s.specLabel}>Connector</Text>
          <Text style={s.specValue}>{v.connector}</Text>
        </View>
        <View style={s.specDivider} />
        <View style={s.spec}>
          <MaterialCommunityIcons name="car-electric" size={14} color={colors.primaryContainer} />
          <Text style={s.specLabel}>Type</Text>
          <Text style={s.specValue} numberOfLines={1}>{v.type.replace(' Listrik', '')}</Text>
        </View>
      </View>

      <View style={s.actionRow}>
        <TouchableOpacity style={s.primaryBtn} onPress={onBook}>
          <MaterialCommunityIcons name="ev-station" size={15} color={colors.onPrimary} />
          <Text style={s.primaryBtnText}>Book Charging</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.secondaryBtn}>
          <MaterialCommunityIcons name="pencil-outline" size={15} color={colors.primaryContainer} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function VehiclesScreen({ navigation }: any) {
  const vehicles = useMemo(() => getUserVehicles(), []);
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.title}>My Vehicles</Text>
        <TouchableOpacity style={styles.addBtn}>
          <MaterialCommunityIcons name="plus" size={22} color={colors.primaryContainer} />
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {vehicles.map(v => <VehicleCard key={v.id} v={v} onBook={() => navigation.navigate('BookSession')} />)}
        <TouchableOpacity style={styles.addCard}>
          <MaterialCommunityIcons name="plus-circle-outline" size={28} color={colors.primaryContainer} />
          <Text style={styles.addText}>Add New Vehicle</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceContainerLowest, borderRadius: radius.xl,
    overflow: 'hidden', ...shadow.card,
  },
  infoRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.base, paddingTop: spacing.md, paddingBottom: spacing.sm,
  },
  info: { flex: 1 },
  model: { fontSize: 17, fontWeight: '700', color: colors.onSurface, marginBottom: 3 },
  plateRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  plate: { ...typography.bodyMd, color: colors.primaryContainer },
  moreBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  specsRow: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: spacing.base, marginBottom: spacing.md,
    backgroundColor: colors.surfaceContainerLow, borderRadius: radius.lg, padding: spacing.md,
  },
  spec: { flex: 1, alignItems: 'center', gap: 3 },
  specDivider: { width: StyleSheet.hairlineWidth, height: 36, backgroundColor: colors.outlineVariant },
  specLabel: { fontSize: 10, fontWeight: '600', color: colors.onSurfaceVariant, letterSpacing: 0.3 },
  specValue: { fontSize: 13, fontWeight: '700', color: colors.onSurface },
  actionRow: {
    flexDirection: 'row', gap: spacing.sm,
    paddingHorizontal: spacing.base, paddingBottom: spacing.base,
  },
  primaryBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.primaryContainer, borderRadius: radius.lg, paddingVertical: 12, gap: 6,
  },
  primaryBtnText: { ...typography.labelLg, color: colors.onPrimary },
  secondaryBtn: {
    width: 46, height: 46, borderRadius: radius.lg, borderWidth: 1.5,
    borderColor: colors.outlineVariant, alignItems: 'center', justifyContent: 'center',
  },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.base, paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.outlineVariant },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '700', color: colors.onSurface },
  addBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing.base, gap: spacing.md },
  addCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.md, backgroundColor: colors.surfaceContainerLowest, borderRadius: radius.xl,
    padding: spacing.lg, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.outlineVariant },
  addText: { ...typography.labelLg, color: colors.primaryContainer, fontSize: 15 },
});
