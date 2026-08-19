import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface Props {
  brand: string;
  model: string;
  color?: string;
  /** 'banner' = full-width card header | 'thumb' = small square */
  variant?: 'banner' | 'thumb';
  style?: any;
}

const BRAND_COLORS: Record<string, string> = {
  BYD:     '#1A4D43',
  Wuling:  '#2D6B5A',
  Hyundai: '#0D2B22',
  Toyota:  '#1F4D40',
  Chery:   '#264D3B',
};

export default function VehicleImage({ brand, model, color, variant = 'banner', style }: Props) {
  const bg = color ?? BRAND_COLORS[brand] ?? '#1A4D43';

  if (variant === 'thumb') {
    return (
      <View style={[t.box, { backgroundColor: bg }, style]}>
        <MaterialCommunityIcons name="car-electric" size={28} color="rgba(255,255,255,0.85)" />
      </View>
    );
  }

  return (
    <View style={[b.banner, { backgroundColor: bg }, style]}>
      {/* Sky gradient strip */}
      <View style={b.sky} />

      {/* Road strip */}
      <View style={b.road} />

      {/* Road markings */}
      {[0.15, 0.38, 0.62, 0.85].map((x, i) => (
        <View key={i} style={[b.roadMark, { left: `${x * 100}%` }]} />
      ))}

      {/* Car shadow on road */}
      <View style={b.carShadow} />

      {/* Main car icon */}
      <MaterialCommunityIcons
        name="car-side"
        size={110}
        color="rgba(255,255,255,0.92)"
        style={b.carIcon}
      />

      {/* Headlight glow */}
      <View style={b.headlight} />

      {/* Brand badge top-left */}
      <View style={b.brandBadge}>
        <Text style={b.brandText}>{brand}</Text>
      </View>

      {/* Model name bottom-right */}
      <View style={b.modelBadge}>
        <Text style={b.modelText}>{model}</Text>
      </View>

      {/* EV badge */}
      <View style={b.evBadge}>
        <MaterialCommunityIcons name="lightning-bolt" size={10} color="rgba(255,255,255,0.9)" />
        <Text style={b.evText}>EV</Text>
      </View>
    </View>
  );
}

const b = StyleSheet.create({
  banner: {
    width: '100%', height: 160, borderRadius: 16,
    overflow: 'hidden', alignItems: 'center', justifyContent: 'center',
  },
  sky: {
    position: 'absolute', top: 0, left: 0, right: 0, height: '60%',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  road: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 28,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  roadMark: {
    position: 'absolute', bottom: 11, width: 24, height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2,
  },
  carShadow: {
    position: 'absolute', bottom: 20, alignSelf: 'center',
    width: 130, height: 8,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 50,
  },
  carIcon: { marginBottom: 12, zIndex: 2 },
  headlight: {
    position: 'absolute', right: '12%', bottom: 38,
    width: 14, height: 8, borderRadius: 4,
    backgroundColor: 'rgba(255,240,150,0.45)',
  },
  brandBadge: {
    position: 'absolute', top: 12, left: 14,
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20,
  },
  brandText: { fontSize: 11, fontWeight: '800', color: 'rgba(255,255,255,0.9)', letterSpacing: 1 },
  modelBadge: {
    position: 'absolute', bottom: 32, right: 14,
  },
  modelText: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.65)' },
  evBadge: {
    position: 'absolute', top: 12, right: 14,
    flexDirection: 'row', alignItems: 'center', gap: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20,
  },
  evText: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.9)' },
});

const t = StyleSheet.create({
  box: {
    width: 64, height: 64, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
});
