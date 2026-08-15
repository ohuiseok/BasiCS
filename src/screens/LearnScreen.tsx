import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BookOpen, Layers3 } from 'lucide-react-native';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Chip } from '../components/Chip';
import { ProgressBar } from '../components/ProgressBar';
import { Screen } from '../components/Screen';
import { domainGroups, foundationItems, learningItems } from '../data/contentData';
import { useStudy } from '../state/StudyContext';
import { colors, radii } from '../theme';
import { LearningStackParamList } from '../types';

type Props = NativeStackScreenProps<LearningStackParamList, 'LearnHome'>;

export function LearnScreen({ navigation }: Props) {
  const study = useStudy();
  const completed = learningItems.filter((item) => study.learningProgress[item.id]).length;
  const recentItem = learningItems.find((item) => item.id === study.lastLearningItemId) ?? learningItems[0];

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View>
          <Text style={styles.title}>학습</Text>
          <Text style={styles.subtitle}>기초부터 도메인까지 필요한 주제만 골라서 읽어보세요.</Text>
        </View>

        <View style={styles.progressCard}>
          <View>
            <Text style={styles.progressLabel}>전체 학습 진행</Text>
            <Text style={styles.progressValue}>
              {completed} / {learningItems.length}
            </Text>
          </View>
          <View style={styles.progressBar}>
            <ProgressBar ratio={completed / Math.max(learningItems.length, 1)} color={colors.teal} />
          </View>
        </View>

        {recentItem ? (
          <Pressable style={styles.resumeCard} onPress={() => navigation.navigate('LearningReader', { itemId: recentItem.id })}>
            <View style={styles.cardText}>
              <Chip label="이어 읽기" tone="teal" />
              <Text style={styles.cardTitle} numberOfLines={2}>
                {recentItem.title}
              </Text>
              <Text style={styles.cardMeta} numberOfLines={1}>
                {recentItem.subtitle}
              </Text>
            </View>
            <BookOpen size={24} color={colors.primary} />
          </Pressable>
        ) : null}

          <>
            <Text style={styles.sectionTitle}>학습 경로</Text>
            <View style={styles.pathGrid}>
              <Pressable style={styles.pathCard} onPress={() => navigation.navigate('LearningFoundation')}>
                <Layers3 size={22} color={colors.primary} />
                <Text style={styles.pathTitle}>기초 챕터</Text>
                <Text style={styles.pathMeta}>
                  {foundationItems.filter((item) => study.learningProgress[item.id]).length} / {foundationItems.length}
                </Text>
              </Pressable>
              {domainGroups.map((domain) => {
                const items = learningItems.filter((item) => item.domainLabel === domain.domainLabel);
                const done = items.filter((item) => study.learningProgress[item.id]).length;
                return (
                  <Pressable key={domain.domainFolder} style={styles.pathCard} onPress={() => navigation.navigate('LearningDomain', { domainFolder: domain.domainFolder })}>
                    <Layers3 size={22} color={colors.primary} />
                    <Text style={styles.pathTitle} numberOfLines={1}>
                      {domain.domainLabel}
                    </Text>
                    <Text style={styles.pathMeta}>
                      {done} / {items.length}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </>
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
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '900',
  },
  subtitle: {
    marginTop: 8,
    color: colors.muted,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '700',
  },
  progressCard: {
    padding: 20,
    backgroundColor: colors.navy,
    borderRadius: radii.xl,
  },
  progressLabel: {
    color: '#93C5FD',
    fontSize: 13,
    fontWeight: '900',
  },
  progressValue: {
    marginTop: 6,
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900',
  },
  progressBar: {
    height: 8,
    marginTop: 16,
  },
  resumeCard: {
    minHeight: 96,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    padding: 18,
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.line,
  },
  sectionTitle: {
    marginTop: 8,
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  pathGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  pathCard: {
    width: '48%',
    minHeight: 112,
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
  },
  pathTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '900',
  },
  pathMeta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '900',
  },
  list: {
    gap: 12,
  },
  listItem: {
    minHeight: 104,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 18,
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.line,
  },
  cardText: {
    flex: 1,
    alignItems: 'flex-start',
    gap: 10,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '900',
  },
  cardMeta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
});
