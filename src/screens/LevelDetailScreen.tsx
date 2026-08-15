import { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { ExternalLink } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Chip } from '../components/Chip';
import { ProgressBar } from '../components/ProgressBar';
import { QuestionCard } from '../components/QuestionCard';
import { Screen } from '../components/Screen';
import { ensureLevelQuestions, getLevel, getLevelQuestionCount, getLevelSourceUrl } from '../data/rawData';
import { useStudy } from '../state/StudyContext';
import { colors, radii } from '../theme';
import { ProblemStackParamList, RootStackParamList } from '../types';

type Props = NativeStackScreenProps<ProblemStackParamList, 'LevelDetail'>;

const INTERVIEW_PRACTICE_URL = 'https://interview-coach-eight-delta.vercel.app/practice';
const DEFAULT_FILTER = '전체';

const getFilterLabels = (level: ReturnType<typeof getLevel>) => {
  const counts = new Map<string, number>();
  level.questions.forEach((question) => {
    [question.domain, question.topic, ...question.keywords].forEach((keyword) => {
      const normalized = keyword.trim();
      if (!normalized) return;
      counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
    });
  });

  return [
    DEFAULT_FILTER,
    ...Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 8)
      .map(([keyword]) => keyword),
  ];
};

const matchesFilter = (question: ReturnType<typeof getLevel>['questions'][number], filter: string) => {
  if (filter === DEFAULT_FILTER) return true;
  return [question.domain, question.topic, question.questionType, ...question.keywords, ...question.connections].some((value) => value === filter);
};

export function LevelDetailScreen({ navigation, route }: Props) {
  const [revision, setRevision] = useState(0);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const level = getLevel(route.params.levelId);
  const study = useStudy();
  const rootNavigation = navigation.getParent()?.getParent() as NativeStackNavigationProp<RootStackParamList> | undefined;
  const filterLabels = useMemo(() => getFilterLabels(level), [level]);
  const [filter, setFilter] = useState(DEFAULT_FILTER);
  const progress = study.getLevelProgress(level.id);
  const nextQuestion = level.questions.find((question) => study.statuses[question.id] !== 'understood') ?? level.questions[0];
  const filtered = useMemo(() => level.questions.filter((question) => matchesFilter(question, filter)), [filter, level.questions]);
  const interviewUrl = useMemo(() => {
    const jsonUrl = getLevelSourceUrl(level.id);
    return `${INTERVIEW_PRACTICE_URL}?json=${encodeURIComponent(jsonUrl)}`;
  }, [level.id]);

  useEffect(() => {
    if (level.questions.length) return;
    let mounted = true;
    setIsLoadingQuestions(true);
    ensureLevelQuestions(level.id)
      .then(() => {
        if (mounted) setRevision((current) => current + 1);
      })
      .catch((error) => console.warn('Failed to load level questions.', error))
      .finally(() => {
        if (mounted) setIsLoadingQuestions(false);
      });
    return () => {
      mounted = false;
    };
  }, [level.id, level.questions.length, revision]);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{level.label}</Text>
        <Text style={styles.subtitle}>{level.target}</Text>
        <View style={styles.progressRow}>
          <Text style={styles.progressLabel}>전체 진행률</Text>
          <Text style={styles.progressValue}>
            {progress.completed} / {getLevelQuestionCount(level)}
          </Text>
        </View>
        <View style={styles.progress}>
          <ProgressBar ratio={progress.ratio} />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {filterLabels.map((label) => (
            <Chip key={label} label={label} active={filter === label} onPress={() => setFilter(label)} />
          ))}
        </ScrollView>
        <View style={styles.list}>
          {!level.questions.length ? (
            <View style={styles.loadingState}>
              {isLoadingQuestions ? <ActivityIndicator color={colors.primary} /> : null}
              <Text style={styles.loadingText}>문제를 불러오고 있습니다.</Text>
            </View>
          ) : null}
          {filtered.map((question) => (
            <QuestionCard
              key={question.id}
              question={question}
              status={study.statuses[question.id]}
              highlighted={question.id === nextQuestion.id}
              onPress={() => rootNavigation?.navigate('Question', { levelId: level.id, questionId: question.id })}
            />
          ))}
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <Pressable style={styles.interviewButton} onPress={() => Linking.openURL(interviewUrl)}>
          <ExternalLink size={17} color={colors.primary} />
          <Text style={styles.interviewText}>면접보기</Text>
        </Pressable>
        <Pressable disabled={!nextQuestion} style={[styles.cta, !nextQuestion && styles.ctaDisabled]} onPress={() => rootNavigation?.navigate('Question', { levelId: level.id, questionId: nextQuestion.id })}>
          <Text style={styles.ctaText}>문제 풀기</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 24,
    paddingBottom: 120,
  },
  title: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '900',
  },
  subtitle: {
    marginTop: 6,
    color: colors.muted,
    fontSize: 12,
  },
  progressRow: {
    marginTop: 26,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabel: {
    color: colors.muted,
    fontSize: 12,
  },
  progressValue: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900',
  },
  progress: {
    marginTop: 10,
    height: 8,
  },
  filters: {
    gap: 10,
    paddingVertical: 24,
  },
  list: {
    gap: 14,
  },
  loadingState: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '800',
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 24,
    paddingBottom: 34,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    flexDirection: 'row',
    gap: 12,
  },
  interviewButton: {
    flex: 1,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.pill,
  },
  interviewText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '900',
  },
  cta: {
    flex: 1,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
  },
  ctaDisabled: {
    opacity: 0.45,
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
});
