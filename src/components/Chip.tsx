import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, radii } from '../theme';

type Props = {
  label: string;
  active?: boolean;
  tone?: 'blue' | 'red' | 'orange' | 'teal' | 'neutral';
  onPress?: () => void;
};

const tones = {
  blue: { bg: colors.primarySoft, fg: colors.primary },
  red: { bg: colors.redSoft, fg: '#DC2626' },
  orange: { bg: colors.orangeSoft, fg: colors.orange },
  teal: { bg: colors.tealSoft, fg: '#0F766E' },
  neutral: { bg: '#F1F5F9', fg: '#475569' },
};

export function Chip({ label, active, tone = 'neutral', onPress }: Props) {
  const palette = active ? { bg: colors.navy, fg: '#FFFFFF' } : tones[tone];
  return (
    <Pressable onPress={onPress} style={[styles.chip, { backgroundColor: palette.bg }]}>
      <Text numberOfLines={1} style={[styles.text, { color: palette.fg }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 30,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
  },
  text: {
    fontSize: 12,
    fontWeight: '800',
  },
});
