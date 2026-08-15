import React from 'react';
import { DimensionValue, StyleSheet, View } from 'react-native';

import { colors } from '../theme';

type Props = {
  ratio: number;
  color?: string;
  height?: number;
};

export function ProgressBar({ ratio, color = colors.primary, height = 7 }: Props) {
  const width = `${Math.max(0, Math.min(1, ratio)) * 100}%` as DimensionValue;
  return (
    <View style={[styles.track, { height, borderRadius: height }]}>
      <View style={[styles.fill, { width, backgroundColor: color, borderRadius: height }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flex: 1,
    backgroundColor: colors.line,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
});
