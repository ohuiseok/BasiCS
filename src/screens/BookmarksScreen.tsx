import { NavigationProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Star, Trash2 } from 'lucide-react-native';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Chip } from '../components/Chip';
import { Screen } from '../components/Screen';
import { learningItems } from '../data/contentData';
import { allQuestions } from '../data/rawData';
import { useStudy } from '../state/StudyContext';
import { colors, radii } from '../theme';
import { BookmarkFolder, RootStackParamList, TabParamList } from '../types';

type Props = {
  navigation: NavigationProp<TabParamList> & { getParent?: () => NativeStackNavigationProp<RootStackParamList> };
};

type Segment = 'learning' | 'problem';
type BookmarkFilter = '전체' | BookmarkFolder;

export function BookmarksScreen({ navigation }: Props) {
  const study = useStudy();
  const [segment, setSegment] = useState<Segment>('learning');
  const [learningFilter, setLearningFilter] = useState<BookmarkFilter>('전체');
  const [problemFilter, setProblemFilter] = useState<BookmarkFilter>('전체');
  const rootNavigation = navigation.getParent?.();
  const learningFilters: BookmarkFilter[] = ['전체', ...study.learningBookmarkFolders];
  const problemFilters: BookmarkFilter[] = ['전체', ...study.bookmarkFolders];

  const learningBookmarked = learningItems.filter((item) => {
    const folder = study.learningBookmarks[item.id];
    if (!folder) return false;
    return learningFilter === '전체' || folder === learningFilter;
  });
  const problemBookmarked = allQuestions.filter((question) => {
    const folder = study.bookmarks[question.id];
    if (!folder) return false;
    return problemFilter === '전체' || folder === problemFilter;
  });

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>보관함</Text>
        <Text style={styles.subtitle}>저장한 학습 콘텐츠와 문제 북마크를 폴더별로 봅니다.</Text>

        <View style={styles.segment}>
          <Pressable style={[styles.segmentButton, segment === 'learning' && styles.segmentActive]} onPress={() => setSegment('learning')}>
            <Text style={[styles.segmentText, segment === 'learning' && styles.segmentTextActive]}>학습</Text>
          </Pressable>
          <Pressable style={[styles.segmentButton, segment === 'problem' && styles.segmentActive]} onPress={() => setSegment('problem')}>
            <Text style={[styles.segmentText, segment === 'problem' && styles.segmentTextActive]}>문제</Text>
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {(segment === 'learning' ? learningFilters : problemFilters).map((item) => (
            <Chip
              key={item}
              label={item}
              active={(segment === 'learning' ? learningFilter : problemFilter) === item}
              onPress={() => (segment === 'learning' ? setLearningFilter(item) : setProblemFilter(item))}
            />
          ))}
        </ScrollView>

        {segment === 'learning' ? (
          learningBookmarked.length ? (
            learningBookmarked.map((item) => (
              <Pressable key={item.id} style={styles.item} onPress={() => navigation.navigate('Learn', { screen: 'LearningReader', params: { itemId: item.id } })}>
                <View style={styles.itemMain}>
                  <Chip label={study.learningBookmarks[item.id]} tone="neutral" />
                  <Chip label={item.kind === 'foundation' ? '기초' : item.levelLabel ?? '학습'} tone="blue" />
                  <Text style={styles.itemTitle} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <Text style={styles.meta} numberOfLines={1}>
                    {item.subtitle}
                  </Text>
                </View>
                <View style={styles.actions}>
                  <Star size={22} color={colors.yellow} fill={colors.yellow} />
                  <Pressable style={styles.deleteButton} onPress={() => study.removeLearningBookmark(item.id)}>
                    <Trash2 size={18} color="#FFFFFF" />
                  </Pressable>
                </View>
              </Pressable>
            ))
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>저장한 학습 콘텐츠가 없어요.</Text>
              <Text style={styles.emptyCopy}>학습 리더에서 북마크 폴더를 선택하면 여기에 모입니다.</Text>
            </View>
          )
        ) : problemBookmarked.length ? (
          problemBookmarked.map((question) => (
            <Pressable key={question.id} style={styles.item} onPress={() => rootNavigation?.navigate('Question', { levelId: question.levelId, questionId: question.id })}>
              <View style={styles.itemMain}>
                <Chip label={study.bookmarks[question.id]} tone="neutral" />
                <Chip label={question.levelLabel} tone={question.levelId === 'beginner' ? 'teal' : 'blue'} />
                <Text style={styles.itemTitle} numberOfLines={2}>
                  {question.question}
                </Text>
                <Text style={styles.meta} numberOfLines={1}>
                  {question.domain} · {question.topic}
                </Text>
              </View>
              <View style={styles.actions}>
                <Star size={22} color={colors.yellow} fill={colors.yellow} />
                <Pressable style={styles.deleteButton} onPress={() => study.removeBookmark(question.id)}>
                  <Trash2 size={18} color="#FFFFFF" />
                </Pressable>
              </View>
            </Pressable>
          ))
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>북마크한 문제가 없어요.</Text>
            <Text style={styles.emptyCopy}>문제 화면에서 북마크 폴더를 선택하면 여기에 모입니다.</Text>
          </View>
        )}
      </ScrollView>
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
    fontSize: 28,
    fontWeight: '900',
  },
  subtitle: {
    marginTop: 6,
    color: colors.muted,
    fontSize: 13,
    lineHeight: 20,
  },
  segment: {
    height: 48,
    flexDirection: 'row',
    gap: 6,
    marginTop: 22,
    marginBottom: 18,
    padding: 5,
    backgroundColor: '#E2E8F0',
    borderRadius: radii.pill,
  },
  segmentButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
  },
  segmentActive: {
    backgroundColor: colors.primary,
  },
  segmentText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '900',
  },
  segmentTextActive: {
    color: '#FFFFFF',
  },
  filters: {
    gap: 10,
    paddingBottom: 18,
  },
  empty: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.line,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  emptyCopy: {
    marginTop: 10,
    color: colors.muted,
    fontSize: 12,
    lineHeight: 20,
    textAlign: 'center',
  },
  item: {
    minHeight: 112,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
    padding: 18,
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.line,
  },
  itemMain: {
    flex: 1,
    alignItems: 'flex-start',
    gap: 10,
  },
  itemTitle: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '900',
  },
  meta: {
    color: colors.muted,
    fontSize: 11,
  },
  actions: {
    alignItems: 'center',
    gap: 14,
  },
  deleteButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.red,
    borderRadius: 19,
  },
});
