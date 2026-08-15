import { Check, Circle, RotateCcw } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii } from '../theme';
import { Question, QuestionStatus } from '../types';

type Props = {
  question: Question;
  highlighted?: boolean;
  status?: QuestionStatus;
  onPress: () => void;
};

const typeColor = (type: string) => {
  if (type.includes('failure')) return colors.red;
  if (type.includes('capacity')) return colors.primary;
  if (type.includes('trade')) return colors.orange;
  if (type.includes('design')) return colors.teal;
  return colors.primary;
};

export function QuestionCard({ question, highlighted, status, onPress }: Props) {
  const done = status === 'understood';
  const review = status === 'review';
  const color = typeColor(question.questionType);
  return (
    <Pressable onPress={onPress} style={[styles.card, highlighted && styles.highlighted, review && styles.reviewCard]}>
      <View style={[styles.status, { backgroundColor: done ? '#DCFCE7' : review ? '#FFEDD5' : '#F1F5F9' }]}>
        {done ? (
          <Check size={18} color="#16A34A" strokeWidth={3} />
        ) : review ? (
          <RotateCcw size={16} color={colors.orange} strokeWidth={3} />
        ) : (
          <Circle size={10} color={highlighted ? colors.primary : '#CBD5E1'} fill={highlighted ? colors.primary : 'transparent'} />
        )}
      </View>
      <View style={styles.body}>
        <Text style={[styles.type, { color }]} numberOfLines={1}>
          {question.questionType.replaceAll('_', ' ').toUpperCase()}
        </Text>
        <Text style={styles.title} numberOfLines={2}>
          {question.question}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {question.domain} · {question.topic}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.lg,
  },
  highlighted: {
    borderColor: colors.primary,
    borderWidth: 1.5,
  },
  reviewCard: {
    borderColor: '#FDBA74',
  },
  status: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    gap: 4,
  },
  type: {
    fontSize: 11,
    fontWeight: '900',
  },
  title: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 20,
  },
  meta: {
    color: colors.muted,
    fontSize: 11,
  },
});
