import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';

import { allQuestions, getLevelQuestionCount, levels } from '../data/rawData';
import { DEFAULT_BOOKMARK_FOLDERS, DEFAULT_LEARNING_BOOKMARK_FOLDERS, BookmarkFolder, LevelId, QuestionStatus, StudyState } from '../types';

const STORAGE_KEY = 'cs-master-study-state-v1';

type StudyContextValue = StudyState & {
  isReady: boolean;
  setQuestionStatus: (questionId: string, status: QuestionStatus) => void;
  toggleBookmark: (questionId: string) => void;
  setBookmarkFolder: (questionId: string, folder: BookmarkFolder) => void;
  addBookmarkFolder: (folder: BookmarkFolder) => void;
  removeBookmarkFolder: (folder: BookmarkFolder) => void;
  removeBookmark: (questionId: string) => void;
  isBookmarked: (questionId: string) => boolean;
  getBookmarkFolder: (questionId: string) => BookmarkFolder | undefined;
  markLearningRead: (itemId: string) => void;
  toggleLearningBookmark: (itemId: string) => void;
  setLearningBookmarkFolder: (itemId: string, folder: BookmarkFolder) => void;
  addLearningBookmarkFolder: (folder: BookmarkFolder) => void;
  removeLearningBookmarkFolder: (folder: BookmarkFolder) => void;
  removeLearningBookmark: (itemId: string) => void;
  isLearningBookmarked: (itemId: string) => boolean;
  getLearningBookmarkFolder: (itemId: string) => BookmarkFolder | undefined;
  getLevelProgress: (levelId: LevelId) => { completed: number; total: number; ratio: number };
  todayStudyCount: number;
  todayLearningCount: number;
  todayProblemCount: number;
};

const initialState: StudyState = {
  statuses: {},
  bookmarks: {},
  bookmarkFolders: [...DEFAULT_BOOKMARK_FOLDERS],
  learningProgress: {},
  learningBookmarks: {},
  learningBookmarkFolders: [...DEFAULT_LEARNING_BOOKMARK_FOLDERS],
  streakDays: 0,
  studiedQuestionDates: {},
  studiedLearningDates: {},
};

const StudyContext = createContext<StudyContextValue | undefined>(undefined);

const getDateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const getStoredRecord = <T,>(value: unknown): Record<string, T> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, T>;
};

const normalizeBookmarks = (value: unknown): Record<string, BookmarkFolder> => {
  const raw = getStoredRecord<unknown>(value);
  return Object.entries(raw).reduce<Record<string, BookmarkFolder>>((bookmarks, [questionId, folder]) => {
    if (folder === false || folder === undefined || folder === null) return bookmarks;
    bookmarks[questionId] = typeof folder === 'string' && folder.trim() ? folder.trim() : '다시 볼 문제';
    return bookmarks;
  }, {});
};

const normalizeBookmarkFolders = (value: unknown, bookmarks: Record<string, BookmarkFolder>): BookmarkFolder[] => {
  const storedFolders = Array.isArray(value) ? value.filter((folder): folder is string => typeof folder === 'string' && Boolean(folder.trim())) : [];
  const baseFolders = Array.isArray(value) ? storedFolders.map((folder) => folder.trim()) : [...DEFAULT_BOOKMARK_FOLDERS];
  return Array.from(new Set([...baseFolders, ...Object.values(bookmarks)]));
};

const normalizeLearningBookmarks = (value: unknown): Record<string, BookmarkFolder> => {
  const raw = getStoredRecord<unknown>(value);
  return Object.entries(raw).reduce<Record<string, BookmarkFolder>>((bookmarks, [itemId, folder]) => {
    if (folder === false || folder === undefined || folder === null) return bookmarks;
    bookmarks[itemId] = typeof folder === 'string' && folder.trim() ? folder.trim() : DEFAULT_LEARNING_BOOKMARK_FOLDERS[0];
    return bookmarks;
  }, {});
};

const normalizeLearningBookmarkFolders = (value: unknown, bookmarks: Record<string, BookmarkFolder>): BookmarkFolder[] => {
  const storedFolders = Array.isArray(value) ? value.filter((folder): folder is string => typeof folder === 'string' && Boolean(folder.trim())) : [];
  const baseFolders = Array.isArray(value) ? storedFolders.map((folder) => folder.trim()) : [...DEFAULT_LEARNING_BOOKMARK_FOLDERS];
  return Array.from(new Set([...baseFolders, ...Object.values(bookmarks)]));
};

const normalizeStoredState = (raw: unknown): StudyState => {
  if (!raw || typeof raw !== 'object') return initialState;
  const parsed = raw as Partial<StudyState>;
  const statuses = getStoredRecord<QuestionStatus>(parsed.statuses);
  const bookmarks = normalizeBookmarks(parsed.bookmarks);
  const bookmarkFolders = normalizeBookmarkFolders(parsed.bookmarkFolders, bookmarks);
  let studiedQuestionDates = getStoredRecord<string>(parsed.studiedQuestionDates);
  const studiedLearningDates = getStoredRecord<string>(parsed.studiedLearningDates);
  const learningProgress = getStoredRecord<string>(parsed.learningProgress);
  const learningBookmarks = normalizeLearningBookmarks(parsed.learningBookmarks);
  const learningBookmarkFolders = normalizeLearningBookmarkFolders(parsed.learningBookmarkFolders, learningBookmarks);

  if (!Object.keys(studiedQuestionDates).length && parsed.lastStudiedAt && Object.keys(statuses).length) {
    const studiedDate = getDateKey(new Date(parsed.lastStudiedAt));
    studiedQuestionDates = Object.keys(statuses).reduce<Record<string, string>>((dates, questionId) => {
      dates[questionId] = studiedDate;
      return dates;
    }, {});
  }

  return {
    statuses,
    bookmarks,
    bookmarkFolders,
    learningProgress,
    learningBookmarks,
    learningBookmarkFolders,
    lastStudiedAt: typeof parsed.lastStudiedAt === 'string' ? parsed.lastStudiedAt : undefined,
    lastLearningItemId: typeof parsed.lastLearningItemId === 'string' ? parsed.lastLearningItemId : undefined,
    streakDays: 0,
    studiedQuestionDates,
    studiedLearningDates,
  };
};

const getStudyMetrics = (studiedQuestionDates: Record<string, string>, studiedLearningDates: Record<string, string>) => {
  const today = getDateKey();
  const studiedDays = new Set([...Object.values(studiedQuestionDates), ...Object.values(studiedLearningDates)]);
  let streakDays = 0;
  let cursor = new Date();
  const todayProblemCount = Object.values(studiedQuestionDates).filter((date) => date === today).length;
  const todayLearningCount = Object.values(studiedLearningDates).filter((date) => date === today).length;

  while (studiedDays.has(getDateKey(cursor))) {
    streakDays += 1;
    cursor = addDays(cursor, -1);
  }

  return {
    todayStudyCount: todayProblemCount + todayLearningCount,
    todayLearningCount,
    todayProblemCount,
    streakDays,
  };
};

export function StudyProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<StudyState>(initialState);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((value) => {
        if (value) setState(normalizeStoredState(JSON.parse(value)));
      })
      .finally(() => setIsReady(true));
  }, []);

  useEffect(() => {
    if (isReady) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => undefined);
    }
  }, [isReady, state]);

  const value = useMemo<StudyContextValue>(() => {
    const setQuestionStatus = (questionId: string, status: QuestionStatus) => {
      setState((prev) => ({
        ...prev,
        statuses: { ...prev.statuses, [questionId]: status },
        studiedQuestionDates: { ...prev.studiedQuestionDates, [questionId]: getDateKey() },
        lastStudiedAt: new Date().toISOString(),
      }));
    };

    const toggleBookmark = (questionId: string) => {
      setState((prev) => ({
        ...prev,
        bookmarks: prev.bookmarks[questionId]
          ? Object.fromEntries(Object.entries(prev.bookmarks).filter(([id]) => id !== questionId))
          : { ...prev.bookmarks, [questionId]: '다시 볼 문제' },
      }));
    };

    const setBookmarkFolder = (questionId: string, folder: BookmarkFolder) => {
      const trimmedFolder = folder.trim();
      if (!trimmedFolder) return;
      setState((prev) => ({
        ...prev,
        bookmarkFolders: Array.from(new Set([...prev.bookmarkFolders, trimmedFolder])),
        bookmarks: { ...prev.bookmarks, [questionId]: trimmedFolder },
      }));
    };

    const addBookmarkFolder = (folder: BookmarkFolder) => {
      const trimmedFolder = folder.trim();
      if (!trimmedFolder) return;
      setState((prev) => ({
        ...prev,
        bookmarkFolders: Array.from(new Set([...prev.bookmarkFolders, trimmedFolder])),
      }));
    };

    const removeBookmarkFolder = (folder: BookmarkFolder) => {
      const trimmedFolder = folder.trim();
      if (!trimmedFolder) return;
      setState((prev) => ({
        ...prev,
        bookmarkFolders: prev.bookmarkFolders.filter((item) => item !== trimmedFolder),
        bookmarks: Object.fromEntries(Object.entries(prev.bookmarks).filter(([, itemFolder]) => itemFolder !== trimmedFolder)),
      }));
    };

    const removeBookmark = (questionId: string) => {
      setState((prev) => ({
        ...prev,
        bookmarks: Object.fromEntries(Object.entries(prev.bookmarks).filter(([id]) => id !== questionId)),
      }));
    };

    const markLearningRead = (itemId: string) => {
      const dateKey = getDateKey();
      setState((prev) => ({
        ...prev,
        learningProgress: { ...prev.learningProgress, [itemId]: dateKey },
        studiedLearningDates: { ...prev.studiedLearningDates, [itemId]: dateKey },
        lastLearningItemId: itemId,
        lastStudiedAt: new Date().toISOString(),
      }));
    };

    const toggleLearningBookmark = (itemId: string) => {
      setState((prev) => {
        const nextBookmarks = { ...prev.learningBookmarks };
        if (nextBookmarks[itemId]) {
          delete nextBookmarks[itemId];
        } else {
          nextBookmarks[itemId] = prev.learningBookmarkFolders[0] ?? DEFAULT_LEARNING_BOOKMARK_FOLDERS[0];
        }
        return { ...prev, learningBookmarks: nextBookmarks };
      });
    };

    const setLearningBookmarkFolder = (itemId: string, folder: BookmarkFolder) => {
      const trimmedFolder = folder.trim();
      if (!trimmedFolder) return;
      setState((prev) => ({
        ...prev,
        learningBookmarkFolders: Array.from(new Set([...prev.learningBookmarkFolders, trimmedFolder])),
        learningBookmarks: { ...prev.learningBookmarks, [itemId]: trimmedFolder },
      }));
    };

    const addLearningBookmarkFolder = (folder: BookmarkFolder) => {
      const trimmedFolder = folder.trim();
      if (!trimmedFolder) return;
      setState((prev) => ({
        ...prev,
        learningBookmarkFolders: Array.from(new Set([...prev.learningBookmarkFolders, trimmedFolder])),
      }));
    };

    const removeLearningBookmarkFolder = (folder: BookmarkFolder) => {
      const trimmedFolder = folder.trim();
      if (!trimmedFolder) return;
      setState((prev) => ({
        ...prev,
        learningBookmarkFolders: prev.learningBookmarkFolders.filter((item) => item !== trimmedFolder),
        learningBookmarks: Object.fromEntries(Object.entries(prev.learningBookmarks).filter(([, itemFolder]) => itemFolder !== trimmedFolder)),
      }));
    };

    const removeLearningBookmark = (itemId: string) => {
      setState((prev) => {
        const nextBookmarks = { ...prev.learningBookmarks };
        delete nextBookmarks[itemId];
        return { ...prev, learningBookmarks: nextBookmarks };
      });
    };

    const getLevelProgress = (levelId: LevelId) => {
      const level = levels.find((item) => item.id === levelId);
      const total = level ? getLevelQuestionCount(level) : 0;
      const completed = level?.questions.filter((question) => state.statuses[question.id] === 'understood').length ?? 0;
      return { completed, total, ratio: total ? completed / total : 0 };
    };

    const metrics = getStudyMetrics(state.studiedQuestionDates, state.studiedLearningDates);

    return {
      ...state,
      streakDays: metrics.streakDays,
      todayStudyCount: metrics.todayStudyCount,
      todayLearningCount: metrics.todayLearningCount,
      todayProblemCount: metrics.todayProblemCount,
      isReady,
      setQuestionStatus,
      toggleBookmark,
      setBookmarkFolder,
      addBookmarkFolder,
      removeBookmarkFolder,
      removeBookmark,
      isBookmarked: (questionId) => Boolean(state.bookmarks[questionId]),
      getBookmarkFolder: (questionId) => state.bookmarks[questionId],
      markLearningRead,
      toggleLearningBookmark,
      setLearningBookmarkFolder,
      addLearningBookmarkFolder,
      removeLearningBookmarkFolder,
      removeLearningBookmark,
      isLearningBookmarked: (itemId) => Boolean(state.learningBookmarks[itemId]),
      getLearningBookmarkFolder: (itemId) => state.learningBookmarks[itemId],
      getLevelProgress,
    };
  }, [isReady, state]);

  return <StudyContext.Provider value={value}>{children}</StudyContext.Provider>;
}

export function useStudy() {
  const context = useContext(StudyContext);
  if (!context) throw new Error('useStudy must be used within StudyProvider');
  return context;
}

export const getOverallStats = (statuses: Record<string, QuestionStatus>) => {
  const completed = allQuestions.length
    ? allQuestions.filter((question) => statuses[question.id] === 'understood').length
    : Object.values(statuses).filter((status) => status === 'understood').length;
  const reviewed = allQuestions.length ? allQuestions.filter((question) => statuses[question.id]).length : Object.keys(statuses).length;
  const total = allQuestions.length || levels.reduce((sum, level) => sum + getLevelQuestionCount(level), 0);
  return {
    completed,
    reviewed,
    total,
    understanding: reviewed ? Math.round((completed / reviewed) * 100) : 0,
  };
};
