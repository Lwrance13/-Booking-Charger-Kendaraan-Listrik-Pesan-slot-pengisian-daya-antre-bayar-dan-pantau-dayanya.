// Mini bar chart used inside the Power Usage stat card
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors } from '../constants/theme';

const BARS = [0.4, 0.55, 0.72, 1.0]; // relative heights

export default function PowerBarChart() {
  return (
    <View style={styles.container}>
      {BARS.map((h, i) => (
        <View
          key={i}
          style={[
            styles.bar,
            {
              height: 28 * h,
              backgroundColor: i === BARS.length - 1 ? colors.primaryContainer : colors.outlineVariant,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    height: 28,
  },
  bar: {
    width: 7,
    borderRadius: 3,
  },
});
