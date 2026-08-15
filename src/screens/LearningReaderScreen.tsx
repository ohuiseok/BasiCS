import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Bookmark, BookmarkCheck, CheckCircle2, ChevronLeft, ChevronRight, ExternalLink, Trash2 } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Chip } from '../components/Chip';
import { LearningDiagramCard } from '../components/LearningDiagramCard';
import { RichText } from '../components/RichText';
import { Screen } from '../components/Screen';
import { ensureLearningItemContent, getAdjacentLearningItems, getLearningItem, LearningDiagram, LearningItem, LearningSource, LearningTerm } from '../data/contentData';
import { useStudy } from '../state/StudyContext';
import { colors, radii } from '../theme';
import { LearningStackParamList } from '../types';

type Props = NativeStackScreenProps<LearningStackParamList, 'LearningReader'>;

const getTerms = (content: unknown, key: 'newTerms' | 'baseTerms') => {
  const value = (content as Record<string, unknown>)[key];
  return Array.isArray(value) ? (value as LearningTerm[]) : [];
};

const getTrimmedString = (content: unknown, key: string) => {
  const value = (content as Record<string, unknown>)[key];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
};

const getStringArray = (content: unknown, key: string) => {
  const value = (content as Record<string, unknown>)[key];
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && Boolean(item.trim())).map((item) => item.trim()) : [];
};

const getVisibleDiagrams = (...values: unknown[]) =>
  values.flatMap((value) => {
    const diagrams = (value as { diagrams?: LearningDiagram[] } | undefined)?.diagrams;
    if (!Array.isArray(diagrams)) return [];
    return diagrams.filter((diagram) => typeof diagram?.mermaid === 'string' && Boolean(diagram.mermaid.trim()));
  });

const getWebSources = (...values: unknown[]) => {
  const seen = new Set<string>();
  const sources: LearningSource[] = [];

  values.forEach((value) => {
    const web = (value as { sources?: { web?: LearningSource[] } } | undefined)?.sources?.web;
    if (!Array.isArray(web)) return;
    web.forEach((source) => {
      if (!source?.url || seen.has(source.url)) return;
      seen.add(source.url);
      sources.push(source);
    });
  });

  return sources;
};

const getTermLabel = (term: LearningTerm) => term.formal?.trim() || term.plain?.trim() || term.description?.trim() || '';

const hasVisibleTerm = (term: LearningTerm) => Boolean(getTermLabel(term));

const getTermKey = (term: LearningTerm, index: number) => `${term.plain ?? ''}:${term.formal ?? ''}:${index}`;

export function LearningReaderScreen({ navigation, route }: Props) {
  const [loadedItem, setLoadedItem] = useState<LearningItem>(() => getLearningItem(route.params.itemId));
  const [isContentLoading, setIsContentLoading] = useState(true);
  const [confirmedTerms, setConfirmedTerms] = useState<Record<string, boolean>>({});
  const item = loadedItem;
  const adjacent = getAdjacentLearningItems(item.id);
  const study = useStudy();
  const bookmarked = study.isLearningBookmarked(item.id);
  const bookmarkFolder = study.getLearningBookmarkFolder(item.id);
  const [bookmarkModalVisible, setBookmarkModalVisible] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const topic = item.topic;
  const content = item.content as Record<string, unknown>;
  const contentText = getTrimmedString(content, 'content');
  const topicWhyNeeded = getTrimmedString(topic ?? {}, 'whyNeeded');
  const topicDefinition = getTrimmedString(topic ?? {}, 'definition');
  const topicMechanism = getTrimmedString(topic ?? {}, 'mechanism');
  const diagrams = getVisibleDiagrams(topic, content);
  const terms = [...getTerms(topic ?? {}, 'baseTerms'), ...getTerms(content, 'newTerms')].filter(hasVisibleTerm);
  const termChecks = useMemo(
    () =>
      terms
        .map((term, index) => ({ term, key: getTermKey(term, index), label: getTermLabel(term) }))
        .filter((term) => term.label)
        .slice(0, 3),
    [terms],
  );
  const completed = Boolean(study.learningProgress[item.id]);
  const confirmedTermCount = termChecks.filter((term) => confirmedTerms[term.key]).length;
  const canComplete = completed || termChecks.length === 0 || confirmedTermCount === termChecks.length;
  const selfCheck = getStringArray(content, 'selfCheck');
  const misconceptions = getStringArray(content, 'misconceptions');
  const sources = getWebSources(topic, content);

  useEffect(() => {
    setConfirmedTerms({});
  }, [item.id]);

  useEffect(() => {
    let mounted = true;
    setIsContentLoading(true);
    ensureLearningItemContent(route.params.itemId)
      .then((nextItem) => {
        if (mounted && nextItem) setLoadedItem({ ...nextItem });
      })
      .finally(() => {
        if (mounted) setIsContentLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [route.params.itemId]);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Chip label={item.kind === 'foundation' ? '기초' : item.levelLabel ?? '학습'} tone={item.kind === 'foundation' ? 'blue' : 'teal'} />
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.subtitle}>{item.subtitle}</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="학습 북마크 폴더 선택" style={styles.bookmarkButton} onPress={() => setBookmarkModalVisible(true)}>
            {bookmarked ? <BookmarkCheck size={24} color={colors.primary} fill={colors.primary} /> : <Bookmark size={24} color={colors.muted} />}
          </Pressable>
        </View>
        {bookmarkFolder ? <Text style={styles.bookmarkFolder}>북마크: {bookmarkFolder}</Text> : null}

        {isContentLoading ? (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Loading</Text>
            <Text style={styles.bullet}>Content is loading.</Text>
          </View>
        ) : null}

        {!isContentLoading && (topicWhyNeeded || topicDefinition || topicMechanism) ? (
          <View style={styles.panel}>
            {topicWhyNeeded ? (
              <>
                <Text style={styles.panelTitle}>왜 필요한가</Text>
                <RichText value={topicWhyNeeded} />
              </>
            ) : null}
            {topicDefinition ? (
              <>
                <Text style={styles.panelTitle}>정의</Text>
                <RichText value={topicDefinition} />
              </>
            ) : null}
            {topicMechanism ? (
              <>
                <Text style={styles.panelTitle}>작동 방식</Text>
                <RichText value={topicMechanism} />
              </>
            ) : null}
          </View>
        ) : null}

        {!isContentLoading && contentText ? <View style={styles.panel}>
          <Text style={styles.panelTitle}>본문</Text>
          <RichText value={contentText} />
        </View> : null}

        {!isContentLoading && diagrams.length ? (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>다이어그램</Text>
            <View style={styles.stack}>
              {diagrams.map((diagram, index) => (
                <LearningDiagramCard key={`${diagram.title ?? 'diagram'}-${index}`} diagram={diagram} />
              ))}
            </View>
          </View>
        ) : null}

        {!isContentLoading && terms.length ? (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>용어</Text>
            <View style={styles.stack}>
              {terms.map((term, index) => (
                <View key={`${term.formal ?? term.plain ?? 'term'}-${index}`} style={styles.termRow}>
                  <Text style={styles.termPlain}>{term.plain ?? term.formal}</Text>
                  <Text style={styles.termFormal}>{term.formal ?? term.description ?? ''}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {!isContentLoading ? (
          <View style={styles.completionPanel}>
            <Text style={styles.panelTitle}>핵심 용어 확인</Text>
            <Text style={styles.completionCopy}>
              {completed
                ? '이미 학습 완료한 챕터입니다.'
                : termChecks.length
                  ? '아래 용어를 스스로 설명할 수 있으면 체크해 주세요.'
                  : '확인할 핵심 용어가 없어 바로 완료할 수 있습니다.'}
            </Text>
            {termChecks.length ? (
              <View style={styles.stack}>
                {termChecks.map(({ term, key, label }) => {
                  const active = completed || Boolean(confirmedTerms[key]);
                  return (
                    <Pressable
                      key={key}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: active }}
                      style={[styles.termCheckRow, active && styles.termCheckRowActive]}
                      onPress={() => {
                        if (completed) return;
                        setConfirmedTerms((current) => ({ ...current, [key]: !current[key] }));
                      }}
                    >
                      <CheckCircle2 size={20} color={active ? colors.teal : colors.faint} fill={active ? colors.tealSoft : 'transparent'} />
                      <View style={styles.termCheckTextWrap}>
                        <Text style={styles.termCheckTitle}>{label}</Text>
                        {term.description ? <Text style={styles.termCheckDescription}>{term.description}</Text> : null}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
            <Pressable
              accessibilityRole="button"
              disabled={!canComplete}
              style={[styles.completeButton, completed && styles.completeButtonDone, !canComplete && styles.completeButtonDisabled]}
              onPress={() => {
                if (!canComplete || completed) return;
                study.markLearningRead(item.id);
              }}
            >
              <CheckCircle2 size={18} color="#FFFFFF" />
              <Text style={styles.completeButtonText}>{completed ? '완료됨' : `학습 완료 ${confirmedTermCount}/${termChecks.length || 0}`}</Text>
            </Pressable>
          </View>
        ) : null}

        {!isContentLoading && misconceptions.length ? (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>오해하기 쉬운 부분</Text>
            <View style={styles.stack}>
              {misconceptions.map((text) => (
                <Text key={text} style={styles.bullet}>
                  - {text}
                </Text>
              ))}
            </View>
          </View>
        ) : null}

        {!isContentLoading && selfCheck.length ? (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>읽고 확인하기</Text>
            <View style={styles.stack}>
              {selfCheck.map((text) => (
                <View key={text} style={styles.checkRow}>
                  <CheckCircle2 size={18} color={colors.teal} />
                  <Text style={styles.checkText}>{text}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}
        {!isContentLoading && sources.length ? (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>출처</Text>
            <View style={styles.stack}>
              {sources.map((source) => (
                <Pressable
                  key={source.url}
                  accessibilityRole="link"
                  style={styles.sourceRow}
                  onPress={() => {
                    if (source.url) Linking.openURL(source.url);
                  }}
                >
                  <Text style={styles.sourceTitle} numberOfLines={2}>
                    {source.title || source.url}
                  </Text>
                  <ExternalLink size={16} color={colors.primary} />
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>

      <Modal animationType="fade" transparent visible={bookmarkModalVisible} onRequestClose={() => setBookmarkModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>학습 북마크 폴더 선택</Text>
            <Text style={styles.modalCopy}>이 학습 콘텐츠를 어디에 저장할까요?</Text>
            {study.learningBookmarkFolders.map((folder) => (
              <View key={folder} style={styles.folderRow}>
                <Pressable
                  style={[styles.folderButton, bookmarkFolder === folder && styles.folderButtonActive]}
                  onPress={() => {
                    study.setLearningBookmarkFolder(item.id, folder);
                    setBookmarkModalVisible(false);
                  }}
                >
                  <Text style={[styles.folderButtonText, bookmarkFolder === folder && styles.folderButtonTextActive]}>{folder}</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${folder} 폴더 삭제`}
                  style={styles.folderDeleteButton}
                  onPress={() => {
                    Alert.alert('학습 북마크 폴더 삭제', `"${folder}" 폴더와 저장된 북마크를 삭제할까요?`, [
                      { text: '취소', style: 'cancel' },
                      {
                        text: '삭제',
                        style: 'destructive',
                        onPress: () => study.removeLearningBookmarkFolder(folder),
                      },
                    ]);
                  }}
                >
                  <Trash2 size={18} color={colors.red} />
                </Pressable>
              </View>
            ))}
            <View style={styles.newFolderRow}>
              <TextInput
                value={newFolderName}
                onChangeText={setNewFolderName}
                placeholder="새 폴더 이름"
                placeholderTextColor={colors.faint}
                style={styles.newFolderInput}
                returnKeyType="done"
              />
              <Pressable
                style={styles.newFolderButton}
                onPress={() => {
                  const folder = newFolderName.trim();
                  if (!folder) return;
                  study.addLearningBookmarkFolder(folder);
                  study.setLearningBookmarkFolder(item.id, folder);
                  setNewFolderName('');
                  setBookmarkModalVisible(false);
                }}
              >
                <Text style={styles.newFolderButtonText}>만들기</Text>
              </Pressable>
            </View>
            {bookmarked ? (
              <Pressable
                style={styles.removeBookmarkButton}
                onPress={() => {
                  study.removeLearningBookmark(item.id);
                  setBookmarkModalVisible(false);
                }}
              >
                <Text style={styles.removeBookmarkText}>북마크 해제</Text>
              </Pressable>
            ) : null}
            <Pressable
              style={styles.modalClose}
              onPress={() => {
                setNewFolderName('');
                setBookmarkModalVisible(false);
              }}
            >
              <Text style={styles.modalCloseText}>닫기</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <View style={styles.footer}>
        <Pressable
          disabled={!adjacent.previous}
          style={[styles.navButton, !adjacent.previous && styles.navButtonDisabled]}
          onPress={() => adjacent.previous && navigation.replace('LearningReader', { itemId: adjacent.previous.id })}
        >
          <ChevronLeft size={18} color={adjacent.previous ? colors.text : colors.faint} />
          <Text style={[styles.navText, !adjacent.previous && styles.navTextDisabled]}>이전</Text>
        </Pressable>
        <Pressable
          disabled={!adjacent.next}
          style={[styles.navButton, styles.nextButton, !adjacent.next && styles.navButtonDisabled]}
          onPress={() => adjacent.next && navigation.replace('LearningReader', { itemId: adjacent.next.id })}
        >
          <Text style={[styles.nextText, !adjacent.next && styles.navTextDisabled]}>다음</Text>
          <ChevronRight size={18} color={adjacent.next ? '#FFFFFF' : colors.faint} />
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 24,
    paddingBottom: 120,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  headerText: {
    flex: 1,
    alignItems: 'flex-start',
    gap: 10,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '900',
  },
  subtitle: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 19,
    fontWeight: '700',
  },
  bookmarkButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.line,
  },
  bookmarkFolder: {
    marginTop: -6,
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'right',
  },
  panel: {
    padding: 18,
    gap: 14,
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.line,
  },
  panelTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  completionPanel: {
    padding: 18,
    gap: 14,
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.teal,
  },
  completionCopy: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '700',
  },
  stack: {
    gap: 12,
  },
  termCheckRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    backgroundColor: '#F8FAFC',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
  },
  termCheckRowActive: {
    backgroundColor: colors.tealSoft,
    borderColor: colors.teal,
  },
  termCheckTextWrap: {
    flex: 1,
  },
  termCheckTitle: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '900',
  },
  termCheckDescription: {
    marginTop: 5,
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
  },
  completeButton: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
  },
  completeButtonDone: {
    backgroundColor: colors.teal,
  },
  completeButtonDisabled: {
    opacity: 0.45,
  },
  completeButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  termRow: {
    padding: 14,
    backgroundColor: '#F8FAFC',
    borderRadius: radii.md,
  },
  termPlain: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '900',
  },
  termFormal: {
    marginTop: 5,
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
  },
  bullet: {
    color: '#334155',
    fontSize: 13,
    lineHeight: 22,
    fontWeight: '700',
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  checkText: {
    flex: 1,
    color: '#334155',
    fontSize: 13,
    lineHeight: 21,
    fontWeight: '700',
  },
  sourceRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: 14,
    backgroundColor: '#F8FAFC',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
  },
  sourceTitle: {
    flex: 1,
    color: colors.primary,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '900',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 18,
    paddingBottom: 28,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  navButton: {
    flex: 1,
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.card,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.line,
  },
  nextButton: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  navButtonDisabled: {
    opacity: 0.45,
    backgroundColor: '#F8FAFC',
    borderColor: colors.line,
  },
  navText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '900',
  },
  nextText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  navTextDisabled: {
    color: colors.faint,
  },
  modalOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
  },
  modalCard: {
    width: '100%',
    padding: 22,
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.line,
  },
  modalTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  modalCopy: {
    marginTop: 8,
    marginBottom: 16,
    color: colors.muted,
    fontSize: 13,
  },
  folderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  folderButton: {
    flex: 1,
    height: 48,
    justifyContent: 'center',
    paddingHorizontal: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
  },
  folderButtonActive: {
    backgroundColor: '#EFF6FF',
    borderColor: colors.primary,
  },
  folderButtonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  folderButtonTextActive: {
    color: colors.primary,
  },
  folderDeleteButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  newFolderRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  newFolderInput: {
    flex: 1,
    height: 46,
    paddingHorizontal: 14,
    color: colors.text,
    backgroundColor: '#F8FAFC',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    fontSize: 14,
    fontWeight: '700',
  },
  newFolderButton: {
    width: 78,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: radii.md,
  },
  newFolderButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  removeBookmarkButton: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    backgroundColor: '#FEF2F2',
    borderRadius: radii.md,
  },
  removeBookmarkText: {
    color: colors.red,
    fontSize: 13,
    fontWeight: '900',
  },
  modalClose: {
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  modalCloseText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '800',
  },
});
