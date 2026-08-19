import React, { useMemo, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Modal, TextInput, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import StatusChip from '../components/StatusChip';
import { colors, radius, shadow, spacing, typography } from '../constants/theme';
import { getTariffPlans, TariffPlan } from '../services/dataService';
import { useDrawer } from '../context/DrawerContext';

function TariffCard({ plan, onEdit }: { plan: TariffPlan; onEdit: () => void }) {
  const isAllDay = plan.timeStart === '00:00' && plan.timeEnd === '23:59';

  return (
    <View style={[tStyles.card, { borderLeftColor: plan.borderColor }]}>
      <View style={tStyles.cardTop}>
        <View style={tStyles.cardTopLeft}>
          <View style={tStyles.iconCircle}>
            <MaterialCommunityIcons name={plan.icon as any} size={18} color={colors.onSurfaceVariant} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={tStyles.nameRow}>
              <Text style={tStyles.planName} numberOfLines={1}>{plan.name}</Text>
              <StatusChip status="active" />
            </View>
            <Text style={tStyles.planId}>ID: {plan.planId}</Text>
          </View>
        </View>
      </View>

      <View style={tStyles.metricsRow}>
        <View style={tStyles.metricBox}>
          <Text style={tStyles.metricLabel}>Energy Rate</Text>
          <Text style={tStyles.metricRate}>${plan.rateUsd.toFixed(2)}<Text style={tStyles.metricUnit}> / kWh</Text></Text>
        </View>
        <View style={tStyles.metricBox}>
          <Text style={tStyles.metricLabel}>Time Window</Text>
          <View style={tStyles.timeRow}>
            <MaterialCommunityIcons name="clock-outline" size={13} color={colors.onSurfaceVariant} />
            <Text style={tStyles.timeText}>
              {isAllDay ? '24 Hours' : `${plan.timeStart} - ${plan.timeEnd}`}
            </Text>
          </View>
        </View>
      </View>

      <View style={tStyles.footer}>
        <Text style={tStyles.applied}>
          {plan.note ?? `Applied to ${plan.appliedStations} stations`}
        </Text>
        <TouchableOpacity style={tStyles.editBtn} onPress={onEdit}>
          <Text style={tStyles.editText}>Edit</Text>
          <MaterialCommunityIcons name="pencil-outline" size={14} color={colors.primaryContainer} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function EditModal({ plan, onClose }: { plan: TariffPlan; onClose: () => void }) {
  const [rate, setRate] = useState(plan.rateUsd.toFixed(2));
  const [planName, setPlanName] = useState(plan.name);
  const [startTime, setStartTime] = useState(plan.timeStart);
  const [endTime, setEndTime] = useState(plan.timeEnd);
  const [status, setStatus] = useState<'active' | 'inactive'>(plan.status);

  const rateNum = parseFloat(rate);
  const isHighRate = !isNaN(rateNum) && rateNum > 0.35;

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={eStyles.overlay} onPress={onClose} />
      <View style={eStyles.sheet}>
        <View style={eStyles.sheetHeader}>
          <Text style={eStyles.sheetTitle}>Edit Tariff</Text>
          <TouchableOpacity onPress={onClose}>
            <MaterialCommunityIcons name="close" size={22} color={colors.onSurface} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={eStyles.fieldLabel}>Plan Name</Text>
          <View style={eStyles.input}>
            <TextInput
              style={eStyles.inputText}
              value={planName}
              onChangeText={setPlanName}
              placeholderTextColor={colors.outline}
            />
          </View>

          {isHighRate && (
            <View style={eStyles.warningBadge}>
              <MaterialCommunityIcons name="alert-outline" size={13} color={colors.secondary} />
              <Text style={eStyles.warningText}>Price Update</Text>
            </View>
          )}

          <Text style={eStyles.fieldLabel}>Rate per kWh (USD)</Text>
          <View style={[eStyles.input, isHighRate && eStyles.inputError]}>
            <Text style={eStyles.dollarSign}>$</Text>
            <TextInput
              style={[eStyles.inputText, eStyles.rateInput, isHighRate && { color: colors.secondary }]}
              value={rate}
              onChangeText={setRate}
              keyboardType="decimal-pad"
              placeholderTextColor={colors.outline}
            />
          </View>
          {isHighRate && (
            <Text style={eStyles.hintText}>Currently 15% higher than regional average.</Text>
          )}

          <View style={eStyles.timeRow}>
            <View style={{ flex: 1 }}>
              <Text style={eStyles.fieldLabel}>Start Time</Text>
              <View style={eStyles.input}>
                <TextInput style={eStyles.inputText} value={startTime} onChangeText={setStartTime} />
                <MaterialCommunityIcons name="clock-outline" size={16} color={colors.outline} />
              </View>
            </View>
            <View style={{ width: spacing.sm }} />
            <View style={{ flex: 1 }}>
              <Text style={eStyles.fieldLabel}>End Time</Text>
              <View style={eStyles.input}>
                <TextInput style={eStyles.inputText} value={endTime} onChangeText={setEndTime} />
                <MaterialCommunityIcons name="clock-outline" size={16} color={colors.outline} />
              </View>
            </View>
          </View>

          <Text style={eStyles.fieldLabel}>Plan Status</Text>
          <View style={eStyles.radioRow}>
            {(['active', 'inactive'] as const).map((opt) => (
              <TouchableOpacity key={opt} style={eStyles.radioOption} onPress={() => setStatus(opt)}>
                <View style={[eStyles.radioOuter, status === opt && eStyles.radioOuterActive]}>
                  {status === opt && <View style={eStyles.radioInner} />}
                </View>
                <Text style={eStyles.radioLabel}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={eStyles.btnRow}>
            <TouchableOpacity style={eStyles.cancelBtn} onPress={onClose}>
              <Text style={eStyles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={eStyles.saveBtn} onPress={onClose}>
              <Text style={eStyles.saveText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

export default function TariffsScreen() {
  const { open: openDrawer } = useDrawer();
  const plans = useMemo(() => getTariffPlans(), []);
  const [editing, setEditing] = useState<TariffPlan | null>(null);

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
        <Text style={styles.pageTitle}>Tariff Management</Text>
        <Text style={styles.pageSubtitle}>Configure pricing models and time-of-use{`\n`}rates for your charging network.</Text>

        <TouchableOpacity style={styles.createBtn}>
          <MaterialCommunityIcons name="plus" size={18} color={colors.onPrimary} />
          <Text style={styles.createText}>Create New Tariff</Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Active Plans</Text>

        {plans.map((plan) => (
          <TariffCard key={plan.id} plan={plan} onEdit={() => setEditing(plan)} />
        ))}
      </ScrollView>

      {editing && <EditModal plan={editing} onClose={() => setEditing(null)} />}
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
  pageTitle: { ...typography.headlineLg, fontSize: 24, color: colors.onSurface, marginBottom: 4 },
  pageSubtitle: { ...typography.bodyMd, color: colors.onSurfaceVariant, marginBottom: spacing.base },
  createBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.primaryContainer, borderRadius: radius.xl,
    paddingVertical: 14, gap: spacing.sm, marginBottom: spacing.lg },
  createText: { ...typography.labelLg, color: colors.onPrimary, fontSize: 15 },
  sectionTitle: { ...typography.headlineMd, fontSize: 18, color: colors.onSurface, marginBottom: spacing.md },
});

const tStyles = StyleSheet.create({
  card: { backgroundColor: colors.surfaceContainerLowest, borderRadius: radius.xl,
    borderLeftWidth: 4, padding: spacing.base, marginBottom: spacing.md, ...shadow.card },
  cardTop: { marginBottom: spacing.md },
  cardTopLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  iconCircle: { width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.surfaceContainerLow, alignItems: 'center', justifyContent: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  planName: { ...typography.labelLg, color: colors.onSurface, fontSize: 14, flex: 1 },
  planId: { ...typography.labelSm, color: colors.onSurfaceVariant, marginTop: 2 },
  metricsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  metricBox: { flex: 1, backgroundColor: colors.surfaceContainerLow, borderRadius: radius.lg, padding: spacing.md },
  metricLabel: { ...typography.labelSm, color: colors.onSurfaceVariant, marginBottom: 4 },
  metricRate: { fontSize: 18, fontWeight: '700', color: colors.secondary },
  metricUnit: { fontSize: 12, fontWeight: '400', color: colors.onSurfaceVariant },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timeText: { ...typography.bodyMd, color: colors.onSurface, fontSize: 13 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.outlineVariant },
  applied: { ...typography.bodySm, color: colors.onSurfaceVariant, flex: 1 },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  editText: { ...typography.labelLg, color: colors.primaryContainer },
});

const eStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { backgroundColor: colors.surfaceContainerLowest, borderTopLeftRadius: radius.xl * 1.5,
    borderTopRightRadius: radius.xl * 1.5, padding: spacing.lg, paddingBottom: 40, maxHeight: '85%' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  sheetTitle: { ...typography.headlineMd, fontSize: 20, color: colors.onSurface },
  fieldLabel: { ...typography.labelLg, color: colors.onSurface, marginBottom: 6, marginTop: spacing.base },
  input: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.md, paddingHorizontal: spacing.base, paddingVertical: 12,
    borderWidth: 1, borderColor: colors.outlineVariant },
  inputError: { borderColor: colors.secondary },
  inputText: { flex: 1, ...typography.bodyMd, color: colors.onSurface, padding: 0 },
  dollarSign: { ...typography.bodyMd, color: colors.onSurfaceVariant, marginRight: 4 },
  rateInput: { fontSize: 20, fontWeight: '600' },
  warningBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  warningText: { ...typography.labelSm, color: colors.secondary },
  hintText: { ...typography.labelSm, color: colors.onSurfaceVariant, marginTop: 4 },
  timeRow: { flexDirection: 'row', marginTop: 0 },
  radioRow: { flexDirection: 'row', gap: spacing.xl, marginTop: 4 },
  radioOption: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  radioOuter: { width: 20, height: 20, borderRadius: 10, borderWidth: 2,
    borderColor: colors.outline, alignItems: 'center', justifyContent: 'center' },
  radioOuterActive: { borderColor: colors.primaryContainer },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primaryContainer },
  radioLabel: { ...typography.bodyMd, color: colors.onSurface },
  btnRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: radius.xl, borderWidth: 1.5,
    borderColor: colors.outlineVariant, alignItems: 'center' },
  cancelText: { ...typography.labelLg, color: colors.onSurface, fontSize: 15 },
  saveBtn: { flex: 1, paddingVertical: 14, borderRadius: radius.xl,
    backgroundColor: colors.primaryContainer, alignItems: 'center' },
  saveText: { ...typography.labelLg, color: colors.onPrimary, fontSize: 15 },
});
