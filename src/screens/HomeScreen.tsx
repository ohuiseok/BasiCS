import { NavigationProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BookOpen, CircleHelp } from 'lucide-react-native';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AdBanner } from '../components/AdBanner';
import { Chip } from '../components/Chip';
import { ProgressBar } from '../components/ProgressBar';
import { Screen } from '../components/Screen';
import { learningItems } from '../data/contentData';
import { getLevelQuestionCount, levels } from '../data/rawData';
import { getOverallStats, useStudy } from '../state/StudyContext';
import { colors, radii } from '../theme';
import { RootStackParamList, TabParamList } from '../types';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList> & { getParent?: () => NativeStackNavigationProp<RootStackParamList> };
};

export function HomeScreen({ navigation }: Props) {
  const study = useStudy();
  const tabNavigation = navigation as unknown as NavigationProp<TabParamList>;
  const problemStats = getOverallStats(study.statuses);
  const completedLearning = learningItems.filter((item) => study.learningProgress[item.id]).length;
  const recentLearning = learningItems.find((item) => item.id === study.lastLearningItemId) ?? learningItems[0];
  const nextProblemLevel = levels.find((level) => study.getLevelProgress(level.id).ratio < 1) ?? levels[0];

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>BasiCS</Text>
            <Text style={styles.subtitle}>학습은 학습대로, 문제는 문제대로</Text>
          </View>
          <View style={styles.logo}>
            <Text style={styles.logoText}>CS</Text>
          </View>
        </View>

        <AdBanner />

        <View style={styles.hero}>
          <View>
            <Text style={styles.heroLabel}>오늘의 루틴</Text>
            <Text style={styles.heroValue}>
              학습 {study.todayLearningCount}개 / 문제 {study.todayProblemCount}개
            </Text>
          </View>
          <View style={styles.streak}>
            <Text style={styles.streakLabel}>연속 학습</Text>
            <Text style={styles.streakValue}>{study.streakDays}일</Text>
          </View>
          <View style={styles.heroBar}>
            <ProgressBar ratio={(completedLearning + problemStats.completed) / Math.max(learningItems.length + problemStats.total, 1)} color={colors.teal} />
          </View>
        </View>

        <Text style={styles.sectionTitle}>바로 시작</Text>
        <Pressable style={styles.pathCard} onPress={() => tabNavigation.navigate('Learn', { screen: 'LearningReader', params: { itemId: recentLearning.id } })}>
          <View style={styles.pathMain}>
            <Chip label="학습 전용" tone="blue" />
            <Text style={styles.pathTitle}>개념을 차근차근 읽기</Text>
            <Text style={styles.pathCopy} numberOfLines={2}>
              {recentLearning.title}
            </Text>
          </View>
          <BookOpen size={26} color={colors.primary} />
        </Pressable>

        <Pressable style={styles.pathCard} onPress={() => tabNavigation.navigate('Problem', { screen: 'LevelDetail', params: { levelId: nextProblemLevel.id } })}>
          <View style={styles.pathMain}>
            <Chip label="문제 전용" tone="orange" />
            <Text style={styles.pathTitle}>문제만 골라서 풀기</Text>
            <Text style={styles.pathCopy} numberOfLines={2}>
              {nextProblemLevel.label} · {study.getLevelProgress(nextProblemLevel.id).completed} / {getLevelQuestionCount(nextProblemLevel)}
            </Text>
          </View>
          <CircleHelp size={26} color={colors.orange} />
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 24,
    paddingBottom: 120,
    gap: 18,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '900',
  },
  subtitle: {
    marginTop: 6,
    color: colors.muted,
    fontSize: 13,
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cyanSoft,
  },
  logoText: {
    color: '#0369A1',
    fontSize: 15,
    fontWeight: '900',
  },
  search: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
    paddingVertical: 0,
  },
  searchPanel: {
    padding: 16,
    gap: 10,
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.line,
  },
  searchTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '900',
  },
  searchResult: {
    padding: 14,
    backgroundColor: '#F8FAFC',
    borderRadius: radii.md,
  },
  searchLevel: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '900',
  },
  searchQuestion: {
    marginTop: 6,
    color: colors.text,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '800',
  },
  emptyText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  hero: {
    padding: 22,
    backgroundColor: colors.navy,
    borderRadius: radii.xl,
  },
  heroLabel: {
    color: '#93C5FD',
    fontSize: 13,
    fontWeight: '900',
  },
  heroValue: {
    marginTop: 6,
    color: '#FFFFFF',
    fontSize: 22,
    lineHeight: 30,
    fontWeight: '900',
  },
  streak: {
    alignSelf: 'flex-start',
    marginTop: 16,
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: '#1E293B',
    borderRadius: radii.md,
  },
  streakLabel: {
    color: '#CBD5E1',
    fontSize: 11,
  },
  streakValue: {
    color: '#38BDF8',
    fontSize: 18,
    fontWeight: '900',
  },
  heroBar: {
    height: 8,
    marginTop: 18,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  pathCard: {
    minHeight: 128,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    padding: 20,
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.line,
  },
  pathMain: {
    flex: 1,
    alignItems: 'flex-start',
    gap: 12,
  },
  pathTitle: {
    color: colors.text,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '900',
  },
  pathCopy: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '700',
  },
});
