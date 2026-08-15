import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii } from '../theme';
import { Level } from '../types';
import { ProgressBar } from './ProgressBar';

type Props = {
  level: Level;
  completed: number;
  onPress: () => void;
};

export function LevelCard({ level, completed, onPress }: Props) {
  const total = level.questionCount ?? level.questions.length;
  const ratio = total ? completed / total : 0;
  const isBeginner = level.id === 'beginner';
  return (
    <Pressable onPress={onPress} style={styles.card}>
      <View style={[styles.badge, { backgroundColor: isBeginner ? colors.tealSoft : colors.primarySoft }]}>
        <Text style={[styles.badgeText, { color: isBeginner ? '#0F766E' : colors.primary }]}>
          {isBeginner ? '입' : level.label.replace('년차', '')}
        </Text>
      </View>
      <Text style={styles.title}>{level.label}</Text>
      <Text style={styles.count}>
        {completed} / {total}
      </Text>
      <ProgressBar ratio={ratio} color={isBeginner ? colors.teal : colors.primary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '31.5%',
    minHeight: 104,
    padding: 14,
    gap: 8,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.lg,
  },
  badge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '900',
  },
  title: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '900',
  },
  count: {
    color: colors.muted,
    fontSize: 11,
  },
});
