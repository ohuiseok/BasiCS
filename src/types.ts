import type { NavigatorScreenParams } from '@react-navigation/native';

export type LevelId =
  | 'beginner'
  | '1year'
  | '2year'
  | '3year'
  | '4year'
  | '5year'
  | '6year'
  | '7year'
  | '8year'
  | '9year'
  | '10year';

export type Reference = {
  title: string;
  url?: string;
};

export type Glossary = Record<string, string>;

export type Question = {
  id: string;
  levelId: LevelId;
  levelLabel: string;
  domain: string;
  topic: string;
  questionType: string;
  question: string;
  keywords: string[];
  connections: string[];
  shortAnswer: string;
  explanation: string;
  glossary: Glossary;
  simpleExplanation: string[];
  diagram?: string;
  references: Reference[];
};

export type Level = {
  id: LevelId;
  label: string;
  target: string;
  sourcePath: string;
  questionCount?: number;
  questions: Question[];
};

export type QuestionStatus = 'new' | 'review' | 'understood';
export const DEFAULT_BOOKMARK_FOLDERS = ['다시 볼 문제', '면접 직전', '깊게 공부'] as const;
export type BookmarkFolder = string;
export const DEFAULT_LEARNING_BOOKMARK_FOLDERS = ['다시 볼 학습', '면접 직전', '깊게 공부'] as const;

export type StudyState = {
  statuses: Record<string, QuestionStatus>;
  bookmarks: Record<string, BookmarkFolder>;
  bookmarkFolders: BookmarkFolder[];
  learningProgress: Record<string, string>;
  learningBookmarks: Record<string, BookmarkFolder>;
  learningBookmarkFolders: BookmarkFolder[];
  lastStudiedAt?: string;
  lastLearningItemId?: string;
  streakDays: number;
  studiedQuestionDates: Record<string, string>;
  studiedLearningDates: Record<string, string>;
};

export type LearningStackParamList = {
  LearnHome: undefined;
  LearningFoundation: undefined;
  LearningDomain: { domainFolder: string };
  LearningTopic: { domainFolder: string; topicFolder: string };
  LearningReader: { itemId: string };
};

export type ProblemStackParamList = {
  ProblemHome: undefined;
  LevelDetail: { levelId: LevelId };
};

export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<TabParamList> | undefined;
  Question: { levelId: LevelId; questionId?: string };
  Answer: { levelId: LevelId; questionId: string };
};

export type TabParamList = {
  Home: undefined;
  Learn: NavigatorScreenParams<LearningStackParamList> | undefined;
  Problem: NavigatorScreenParams<ProblemStackParamList> | undefined;
  Library: undefined;
  Stats: undefined;
};
