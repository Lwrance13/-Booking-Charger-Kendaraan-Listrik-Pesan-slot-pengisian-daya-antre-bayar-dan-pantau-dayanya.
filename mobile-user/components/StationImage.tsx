import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface Props { size?: 'sm' | 'md' | 'lg'; style?: any }

export default function StationImage({ size = 'md', style }: Props) {
  const dim = size === 'sm' ? 56 : size === 'lg' ? 140 : 80;
  return (
    <View style={[s.box, { width: dim, height: dim, borderRadius: dim * 0.15 }, style]}>
      {/* sky */}
      <View style={s.sky} />
      {/* ground */}
      <View style={s.ground} />
      {/* charger unit */}
      <View style={[s.unit, size === 'sm' && s.unitSm]}>
        <MaterialCommunityIcons name="ev-station" size={size === 'sm' ? 16 : size === 'lg' ? 36 : 24} color="#fff" />
      </View>
      {/* cable hint */}
      <View style={s.cable} />
    </View>
  );
}

const s = StyleSheet.create({
  box: { overflow: 'hidden', position: 'relative', backgroundColor: '#1A4D43' },
  sky: { position: 'absolute', top: 0, left: 0, right: 0, height: '55%', backgroundColor: '#2D6B5A' },
  ground: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '30%', backgroundColor: '#1A3A2E' },
  unit: { position: 'absolute', bottom: '20%', left: '20%', width: '35%', height: '60%',
    backgroundColor: '#00362D', borderRadius: 6, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  unitSm: { left: '15%', width: '40%' },
  cable: { position: 'absolute', bottom: '18%', left: '50%', width: 3, height: '25%',
    backgroundColor: 'rgba(255,255,255,0.4)', borderRadius: 2 },
});
