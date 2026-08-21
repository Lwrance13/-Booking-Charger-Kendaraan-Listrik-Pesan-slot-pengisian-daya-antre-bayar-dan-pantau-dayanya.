import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import StatusChip from '../components/StatusChip';
import { colors, radius, shadow, spacing, typography } from '../constants/theme';
import { getUserBalance, getUserInvoices } from '../services/userDataService';
import { getMyInvoiceHistory, getToken } from '../services/apiService';

export default function WalletScreen() {
  const balance = useMemo(() => getUserBalance(), []);
  const [invoices, setInvoices] = useState<any[]>(() => getUserInvoices())
  useEffect(() => {
    getToken().then(() => getMyInvoiceHistory()).then((rows: any[]) => {
      if (rows && rows.length > 0) setInvoices(rows)
    }).catch(() => {})
  }, [])
  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar style="dark" />
      <View style={s.header}><Text style={s.title}>Wallet</Text></View>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.balanceCard}>
          <Text style={s.balLabel}>CURRENT BALANCE</Text>
          <Text style={s.balAmount}>${balance.toFixed(2)}</Text>
          <View style={s.btnRow}>
            <TouchableOpacity style={s.btn} onPress={() => alert('Top Up\n\nPilih nominal:\n• Rp 50.000\n• Rp 100.000\n• Rp 200.000\n\nFitur pembayaran akan tersedia setelah backend terhubung.')}>
              <MaterialCommunityIcons name="plus" size={18} color={colors.onPrimary} />
              <Text style={s.btnText}>Top Up</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.btn, s.btnOutline]}>
              <MaterialCommunityIcons name="history" size={18} color={colors.primaryContainer} />
              <Text style={[s.btnText, { color: colors.primaryContainer }]}>History</Text>
            </TouchableOpacity>
          </View>
        </View>
        <Text style={s.sectionTitle}>Recent Transactions</Text>
        {invoices.map((inv: any) => (
          <View key={inv.invoice_id} style={s.txCard}>
            <View style={s.txRow}>
              <Text style={s.txId}>{inv.invoice_id}</Text>
              <StatusChip status={inv.payment_status} />
            </View>
            <View style={s.txRow}>
              <Text style={s.txMethod}>{inv.payment_method ?? 'Online Payment'}</Text>
              <Text style={s.txAmount}>Rp {(inv.total_amount ?? 0).toLocaleString('id-ID')}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.base, paddingVertical: spacing.md },
  title: { fontSize: 22, fontWeight: '700', color: colors.onSurface },
  content: { paddingHorizontal: spacing.base, paddingBottom: spacing.xl },
  balanceCard: { backgroundColor: colors.primaryContainer, borderRadius: radius.xl,
    padding: spacing.lg, marginBottom: spacing.lg },
  balLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 1, color: colors.onPrimaryContainer, marginBottom: 4 },
  balAmount: { fontSize: 40, fontWeight: '700', color: colors.onPrimary, marginBottom: spacing.lg },
  btnRow: { flexDirection: 'row', gap: spacing.md },
  btn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: radius.lg, paddingVertical: 12, gap: 6 },
  btnOutline: { backgroundColor: colors.surfaceContainerLowest },
  btnText: { ...typography.labelLg, color: colors.onPrimary },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.onSurface, marginBottom: spacing.md },
  txCard: { backgroundColor: colors.surfaceContainerLowest, borderRadius: radius.lg,
    padding: spacing.base, marginBottom: spacing.sm, ...shadow.card },
  txRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  txId: { ...typography.labelLg, color: colors.onSurface },
  txMethod: { ...typography.bodySm, color: colors.onSurfaceVariant },
  txAmount: { ...typography.labelLg, color: colors.primaryContainer },
});
