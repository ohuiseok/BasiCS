import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radii } from '../theme';

type Props = {
  value: string;
  label: string;
  color?: string;
};

export function StatCard({ value, label, color = colors.primary }: Props) {
  return (
    <View style={styles.card}>
      <Text style={[styles.value, { color }]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 86,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.lg,
  },
  value: {
    fontSize: 24,
    fontWeight: '900',
  },
  label: {
    marginTop: 6,
    color: colors.muted,
    fontSize: 11,
  },
});
