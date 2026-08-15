import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Bookmark, BookmarkCheck, ChevronLeft, Trash2 } from 'lucide-react-native';
import React, { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Chip } from '../components/Chip';
import { ProgressBar } from '../components/ProgressBar';
import { Screen } from '../components/Screen';
import { ensureLevelQuestions, getLevel, getLevelQuestionCount, getNextQuestion, getQuestion } from '../data/rawData';
import { useStudy } from '../state/StudyContext';
import { colors, radii } from '../theme';
import { RootStackParamList } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Question'>;

export function QuestionScreen({ navigation, route }: Props) {
  const [revision, setRevision] = useState(0);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const level = getLevel(route.params.levelId);
  const question = level.questions.length ? getQuestion(route.params.levelId, route.params.questionId) : undefined;
  const study = useStudy();
  const [bookmarkModalVisible, setBookmarkModalVisible] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const goBackToList = useCallback(() => {
    navigation.navigate('MainTabs', { screen: 'Problem', params: { screen: 'LevelDetail', params: { levelId: level.id } } });
  }, [navigation, level.id]);

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

  if (!question) {
    return (
      <Screen>
        <View style={styles.loadingState}>
          {isLoadingQuestions ? <ActivityIndicator color={colors.primary} /> : null}
          <Text style={styles.loadingText}>문제를 불러오고 있습니다.</Text>
        </View>
      </Screen>
    );
  }

  const index = Math.max(0, level.questions.findIndex((item) => item.id === question.id));
  const bookmarked = study.isBookmarked(question.id);
  const bookmarkFolder = study.getBookmarkFolder(question.id);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <Pressable accessibilityRole="button" accessibilityLabel="문제 목록으로 돌아가기" onPress={goBackToList} style={styles.headerBack}>
          <ChevronLeft size={28} color={colors.text} />
        </Pressable>
      ),
    });
  }, [navigation, goBackToList]);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.top}>
          <Text style={styles.topTitle}>
            {level.label} · {index + 1} / {getLevelQuestionCount(level)}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="북마크 폴더 선택"
            style={styles.bookmark}
            onPress={() => setBookmarkModalVisible(true)}
          >
            {bookmarked ? <BookmarkCheck size={22} color={colors.primary} fill={colors.primary} /> : <Bookmark size={22} color={colors.muted} />}
          </Pressable>
        </View>
        {bookmarkFolder ? <Text style={styles.bookmarkFolder}>북마크: {bookmarkFolder}</Text> : null}
        <View style={styles.progress}>
          <ProgressBar ratio={(index + 1) / getLevelQuestionCount(level)} />
        </View>
        <View style={styles.chips}>
          <Chip label={question.questionType.toUpperCase()} tone={question.questionType.includes('failure') ? 'red' : 'blue'} />
          {question.keywords.slice(0, 2).map((keyword) => (
            <Chip key={keyword} label={keyword} tone="neutral" />
          ))}
        </View>
        <View style={styles.questionCard}>
          <Text style={styles.cardLabel}>QUESTION</Text>
          <Text style={styles.question}>{question.question}</Text>
          <View style={styles.divider} />
          <Text style={styles.keywordLabel}>KEYWORDS</Text>
          <View style={styles.keywordWrap}>
            {question.keywords.slice(0, 5).map((keyword) => (
              <Chip key={keyword} label={keyword} />
            ))}
          </View>
        </View>
        <View style={styles.hintCard}>
          <Text style={styles.hint}>머릿속으로 먼저 답을 정리한 뒤</Text>
          <Text style={styles.hint}>아래 버튼으로 모범 답변을 확인하세요.</Text>
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <Pressable style={styles.cta} onPress={() => navigation.navigate('Answer', { levelId: level.id, questionId: question.id })}>
          <Text style={styles.ctaText}>정답 확인하기</Text>
        </Pressable>
        <Pressable
          style={styles.skip}
          onPress={() => {
            const next = getNextQuestion(level.id, question.id);
            navigation.replace('Question', { levelId: level.id, questionId: next.id });
          }}
        >
          <Text style={styles.skipText}>건너뛰기</Text>
        </Pressable>
      </View>
      <Modal animationType="fade" transparent visible={bookmarkModalVisible} onRequestClose={() => setBookmarkModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>북마크 폴더 선택</Text>
            <Text style={styles.modalCopy}>이 문제를 어디에 저장할까요?</Text>
            {study.bookmarkFolders.map((folder) => (
              <View key={folder} style={styles.folderRow}>
                <Pressable
                  style={[styles.folderButton, bookmarkFolder === folder && styles.folderButtonActive]}
                  onPress={() => {
                    study.setBookmarkFolder(question.id, folder);
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
                    Alert.alert('북마크 폴더 삭제', `"${folder}" 폴더와 저장된 북마크를 삭제할까요?`, [
                      { text: '취소', style: 'cancel' },
                      {
                        text: '삭제',
                        style: 'destructive',
                        onPress: () => study.removeBookmarkFolder(folder),
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
                  study.addBookmarkFolder(folder);
                  study.setBookmarkFolder(question.id, folder);
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
                  study.removeBookmark(question.id);
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 24,
    paddingBottom: 170,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  loadingText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '800',
  },
  topTitle: {
    flex: 1,
    textAlign: 'center',
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  bookmark: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 18,
  },
  progress: {
    height: 7,
    marginTop: 14,
  },
  bookmarkFolder: {
    marginTop: 10,
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'right',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 24,
  },
  questionCard: {
    marginTop: 24,
    padding: 24,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.xl,
  },
  cardLabel: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900',
  },
  question: {
    marginTop: 26,
    color: colors.text,
    fontSize: 19,
    fontWeight: '900',
    lineHeight: 30,
  },
  divider: {
    height: 1,
    marginVertical: 28,
    backgroundColor: colors.line,
  },
  keywordLabel: {
    color: colors.faint,
    fontSize: 11,
    fontWeight: '900',
  },
  keywordWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  hintCard: {
    minHeight: 142,
    marginTop: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.xl,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    backgroundColor: colors.card,
  },
  hint: {
    color: colors.faint,
    fontSize: 13,
    lineHeight: 24,
    fontWeight: '700',
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 24,
    paddingBottom: 34,
    backgroundColor: colors.bg,
  },
  cta: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  skip: {
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipText: {
    color: colors.faint,
    fontSize: 12,
    fontWeight: '800',
  },
  headerBack: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -8,
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
