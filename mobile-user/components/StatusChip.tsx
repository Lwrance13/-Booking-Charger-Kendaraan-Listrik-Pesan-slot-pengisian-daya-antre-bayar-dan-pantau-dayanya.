import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius, typography } from '../constants/theme';

const MAP: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  upcoming:  { bg: '#FFF8E1', text: colors.amber,          dot: colors.amber,          label: 'Upcoming' },
  active:    { bg: '#DFF2EE', text: colors.primaryContainer, dot: colors.primaryContainer, label: 'Active' },
  completed: { bg: '#E8F5E9', text: '#2E7D32',             dot: '#2E7D32',             label: 'Completed' },
  cancelled: { bg: '#FDECEA', text: colors.secondary,       dot: colors.secondary,      label: 'Cancelled' },
  pending:   { bg: '#FFF8E1', text: colors.amber,           dot: colors.amber,          label: 'Pending' },
  paid:      { bg: '#DFF2EE', text: colors.primaryContainer, dot: colors.primaryContainer, label: 'Paid' },
  failed:    { bg: '#FDECEA', text: colors.secondary,        dot: colors.secondary,      label: 'Failed' },
};

export default function StatusChip({ status }: { status: string }) {
  const cfg = MAP[status.toLowerCase()] ?? MAP.pending;
  return (
    <View style={[s.chip, { backgroundColor: cfg.bg }]}>
      <View style={[s.dot, { backgroundColor: cfg.dot }]} />
      <Text style={[s.label, { color: cfg.text }]}>{cfg.label}</Text>
    </View>
  );
}
const s = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, gap: 5 },
  dot: { width: 7, height: 7, borderRadius: 99 },
  label: { ...typography.labelMd },
});
