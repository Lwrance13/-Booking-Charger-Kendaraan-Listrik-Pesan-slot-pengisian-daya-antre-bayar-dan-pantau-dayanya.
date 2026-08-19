import React from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../constants/theme';

interface Marker { x: number; y: number; color: string; label: string }

const MARKERS: Marker[] = [
  { x: 90,  y: 55,  color: colors.primaryContainer, label: '4 SLOT' },
  { x: 230, y: 90,  color: colors.amber,             label: '1 SLOT' },
  { x: 170, y: 150, color: colors.primaryContainer,  label: '3 SLOT' },
  { x: 310, y: 130, color: colors.secondary,         label: '0 SLOT' },
  { x: 60,  y: 140, color: colors.amber,             label: '2 SLOT' },
];

const STREETS_H = [40, 100, 160, 205];
const STREETS_V = [50, 130, 210, 300];

export default function MapPlaceholder({ onSearch }: { onSearch?: () => void }) {
  return (
    <View style={s.container}>
      {/* Map background */}
      <View style={s.map}>
        {STREETS_H.map(y => <View key={y} style={[s.streetH, { top: y }]} />)}
        {STREETS_V.map(x => <View key={x} style={[s.streetV, { left: x }]} />)}
        {/* Station markers */}
        {MARKERS.map((m, i) => (
          <View key={i} style={[s.marker, { left: m.x, top: m.y }]}>
            <View style={[s.markerDot, { backgroundColor: m.color }]} />
            <View style={[s.markerLabel, { backgroundColor: m.color }]}>
              <Text style={s.markerText}>{m.label}</Text>
            </View>
          </View>
        ))}
        {/* Search bar over map */}
        <View style={s.searchRow}>
          <View style={s.searchBox}>
            <MaterialCommunityIcons name="magnify" size={16} color={colors.outline} />
            <TextInput
              style={s.searchInput}
              placeholder="Search location or station ID..."
              placeholderTextColor={colors.outline}
              onFocus={onSearch}
            />
          </View>
          <TouchableOpacity style={s.gpsBtn}>
            <MaterialCommunityIcons name="crosshairs-gps" size={18} color={colors.onPrimary} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { height: 230, overflow: 'hidden' },
  map: { flex: 1, backgroundColor: '#E8F0EB' },
  streetH: { position: 'absolute', left: 0, right: 0, height: 10, backgroundColor: '#D4E2D8' },
  streetV: { position: 'absolute', top: 0, bottom: 0, width: 8, backgroundColor: '#D4E2D8' },
  marker: { position: 'absolute', alignItems: 'center' },
  markerDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: '#fff' },
  markerLabel: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4, marginTop: 2 },
  markerText: { fontSize: 8, fontWeight: '700', color: '#fff' },
  searchRow: { position: 'absolute', top: 12, left: 12, right: 12, flexDirection: 'row', gap: 8 },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: radius.xl, paddingHorizontal: 12, paddingVertical: 9, gap: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12,
    shadowRadius: 6, elevation: 4 },
  searchInput: { flex: 1, fontSize: 13, color: colors.onSurface, padding: 0 },
  gpsBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primaryContainer,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15,
    shadowRadius: 4, elevation: 4 },
});
