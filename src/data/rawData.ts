import { Glossary, Level, LevelId, Question, Reference } from '../types';
import { fetchCachedJson, fetchCacheFirstJson, fetchFreshJson, fetchRemoteJson, readCachedJson, remoteUrl, S3_BASE_URL, writeCachedJson } from './remoteCache';
import seedDataIndex from './seedDataIndex.json';

export { S3_BASE_URL };

type RawQuestion = {
  id?: string;
  domain?: string;
  topic?: string;
  questionType?: string;
  question?: string;
  keywords?: unknown;
  connections?: unknown;
  shortAnswer?: string;
  explanation?: string;
  glossary?: unknown;
  simpleExplanation?: unknown;
  diagram?: unknown;
  references?: unknown;
};

type RawLevel = {
  level?: string;
  target?: string;
  questions?: RawQuestion[];
};

type DataIndex = {
  version?: string;
  levels?: Array<{
    id?: string;
    label?: string;
    target?: string;
    path?: string;
    questionCount?: number;
  }>;
};

type DatasetVersion = {
  version?: string;
};

const DATA_VERSION_PATH = 'data/version.json';

const levelFiles: Array<{ id: LevelId; path: string }> = [
  { id: 'beginner', path: 'data/cs_beginner.json' },
  { id: '1year', path: 'data/cs_backend_1year.json' },
  { id: '2year', path: 'data/cs_backend_2year.json' },
  { id: '3year', path: 'data/cs_backend_3year.json' },
  { id: '4year', path: 'data/cs_backend_4year.json' },
  { id: '5year', path: 'data/cs_backend_5year.json' },
  { id: '6year', path: 'data/cs_backend_6year.json' },
  { id: '7year', path: 'data/cs_backend_7year.json' },
  { id: '8year', path: 'data/cs_backend_8year.json' },
  { id: '9year', path: 'data/cs_backend_9year.json' },
  { id: '10year', path: 'data/cs_backend_10year.json' },
];

const levelLabels: Record<LevelId, string> = {
  beginner: '입문',
  '1year': '1년차',
  '2year': '2년차',
  '3year': '3년차',
  '4year': '4년차',
  '5year': '5년차',
  '6year': '6년차',
  '7year': '7년차',
  '8year': '8년차',
  '9year': '9년차',
  '10year': '10년차',
};

export const levels: Level[] = [];
export const allQuestions: Question[] = [];

const dataPath = (path?: string) => {
  const normalized = path?.replace(/^\/+/, '') ?? '';
  if (normalized.startsWith('study/data/')) return normalized.replace(/^study\/data\/+/, 'data/');
  return normalized;
};

const toArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0) : [];

const normalizeGlossary = (value: unknown): Glossary => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.entries(value).reduce<Glossary>((glossary, [term, description]) => {
    if (typeof description === 'string' && description.trim()) {
      glossary[term] = description;
    }
    return glossary;
  }, {});
};

const normalizeReferences = (value: unknown): Reference[] => {
  if (!Array.isArray(value)) return [];
  const references: Reference[] = [];
  value.forEach((item) => {
    if (!item || typeof item !== 'object') return;
    const ref = item as { title?: unknown; url?: unknown };
    if (typeof ref.title !== 'string' || !ref.title.trim()) return;
    references.push({ title: ref.title, url: typeof ref.url === 'string' && ref.url.trim() ? ref.url : undefined });
  });
  return references;
};

const normalizeLevelId = (value: string | undefined, index: number): LevelId => {
  if (value === 'beginner') return 'beginner';
  if (value && /^([1-9]|10)year$/.test(value)) return value as LevelId;
  return (index === 0 ? 'beginner' : `${index}year`) as LevelId;
};

const normalizeLevel = (raw: RawLevel, index: number, meta?: { id?: string; label?: string; target?: string; path?: string }): Level => {
  const id = normalizeLevelId(raw.level ?? meta?.id, index);
  const label = meta?.label ?? levelLabels[id];
  const sourcePath = meta?.path ?? levelFiles[index]?.path ?? '';
  const questions: Question[] = (raw.questions ?? []).map((question, questionIndex) => ({
    id: question.id ?? `${id}-${String(questionIndex + 1).padStart(3, '0')}`,
    levelId: id,
    levelLabel: label,
    domain: question.domain ?? 'general',
    topic: question.topic ?? 'topic',
    questionType: question.questionType ?? 'general',
    question: question.question ?? '질문 내용이 없습니다.',
    keywords: toArray(question.keywords),
    connections: toArray(question.connections),
    shortAnswer: question.shortAnswer ?? '핵심 답변이 준비되지 않았습니다.',
    explanation: question.explanation ?? '상세 설명이 준비되지 않았습니다.',
    glossary: normalizeGlossary(question.glossary),
    simpleExplanation: toArray(question.simpleExplanation),
    diagram: typeof question.diagram === 'string' && question.diagram.trim() ? question.diagram : undefined,
    references: normalizeReferences(question.references),
  }));

  return {
    id,
    label,
    target: raw.target ?? meta?.target ?? label,
    sourcePath,
    questionCount: questions.length || undefined,
    questions,
  };
};

const normalizeLevelMeta = (meta: { id?: string; label?: string; target?: string; path?: string; questionCount?: number }, index: number): Level => {
  const id = normalizeLevelId(meta.id, index);
  const label = meta.label ?? levelLabels[id];
  return {
    id,
    label,
    target: meta.target ?? label,
    sourcePath: dataPath(meta.path) || levelFiles[index]?.path || '',
    questionCount: meta.questionCount,
    questions: [],
  };
};

type JsonLoader = <T>(path: string) => Promise<T>;

const loadProblemData = async (loadJson: JsonLoader) => {
  let index: DataIndex | undefined;
  try {
    index = await loadJson<DataIndex>('data/index.json');
  } catch {
    index = undefined;
  }

  const sources = levelFiles.map((fallback, indexPosition) => {
    const indexed = index?.levels?.find((item) => item.id === fallback.id);
    return {
      id: fallback.id,
      path: dataPath(indexed?.path) || fallback.path,
      label: indexed?.label,
      target: indexed?.target,
      indexPosition,
    };
  });

  const loadedLevels = await Promise.all(
    sources.map(async (source) => normalizeLevel(await loadJson<RawLevel>(source.path), source.indexPosition, source)),
  );

  levels.splice(0, levels.length, ...loadedLevels);
  allQuestions.splice(0, allQuestions.length, ...loadedLevels.flatMap((level) => level.questions));
};

const loadProblemIndexData = async (loadJson: JsonLoader) => {
  let index: DataIndex | undefined;
  try {
    index = await loadJson<DataIndex>('data/index.json');
  } catch {
    index = undefined;
  }

  const loadedLevels = levelFiles.map((fallback, indexPosition) => {
    const indexed = index?.levels?.find((item) => item.id === fallback.id);
    return normalizeLevelMeta(
      {
        id: fallback.id,
        path: dataPath(indexed?.path) || fallback.path,
        label: indexed?.label,
        target: indexed?.target,
        questionCount: indexed?.questionCount,
      },
      indexPosition,
    );
  });

  levels.splice(0, levels.length, ...loadedLevels);
  allQuestions.splice(0, allQuestions.length);
};

const requireCachedJson = async <T,>(path: string) => {
  const cached = await readCachedJson<T>(path);
  if (cached === undefined) throw new Error(`No cached data for ${path}`);
  return cached;
};

const getProblemSources = (index?: DataIndex) =>
  levelFiles.map((fallback, indexPosition) => {
    const indexed = index?.levels?.find((item) => item.id === fallback.id);
    return {
      path: dataPath(indexed?.path) || fallback.path,
      indexPosition,
    };
  });

const hasCachedProblemData = async () => {
  const index = await readCachedJson<DataIndex>('data/index.json');
  if (index === undefined) return false;

  const sources = getProblemSources(index);
  const cachedLevels = await Promise.all(sources.map((source) => readCachedJson<RawLevel>(source.path)));
  return cachedLevels.every((level) => level !== undefined);
};

const formatSyncFailures = (label: string, failures: Array<{ path: string; error: unknown }>) =>
  `${label} sync failed for ${failures.length} file(s): ${failures
    .slice(0, 12)
    .map((failure) => `${failure.path} (${failure.error instanceof Error ? failure.error.message : String(failure.error)})`)
    .join(', ')}`;

const fetchProblemFile = async (path: string) => {
  try {
    await fetchFreshJson<RawLevel>(path);
    return undefined;
  } catch (error) {
    return { path, error };
  }
};

export const syncProblemData = async () => {
  const remoteVersion = await fetchRemoteJson<DatasetVersion>(DATA_VERSION_PATH);
  const cachedVersion = await readCachedJson<DatasetVersion>(DATA_VERSION_PATH);
  const isSameVersion = Boolean(remoteVersion.version && remoteVersion.version === cachedVersion?.version);

  if (isSameVersion && (await hasCachedProblemData())) return;

  const index = await fetchFreshJson<DataIndex>('data/index.json');
  const sources = getProblemSources(index);
  const failures = (await Promise.all(sources.map((source) => fetchProblemFile(source.path)))).filter(
    (failure): failure is { path: string; error: unknown } => failure !== undefined,
  );
  if (failures.length) throw new Error(formatSyncFailures('Problem data', failures));
  await writeCachedJson(DATA_VERSION_PATH, remoteVersion);
};

export const loadCachedProblemData = async () => loadProblemData(requireCachedJson);

export const loadFreshProblemData = async () => loadProblemData(fetchFreshJson);

export const loadRemoteProblemData = async () => {
  return loadProblemIndexData(fetchCachedJson);
};

export const loadCachedProblemIndexData = async () => loadProblemIndexData(requireCachedJson);

export const loadSeedProblemData = async () => loadProblemIndexData(async <T,>() => seedDataIndex as T);

export const loadSyncedProblemData = async () => loadProblemData(requireCachedJson);

export const ensureLevelQuestions = async (levelId: LevelId) => {
  const current = getLevel(levelId);
  if (current?.questions.length) return current;

  const levelIndex = levelFiles.findIndex((item) => item.id === levelId);
  const sourcePath = current?.sourcePath ?? levelFiles[levelIndex]?.path ?? '';
  const raw = await fetchCacheFirstJson<RawLevel>(sourcePath, (fresh) => {
    const freshLevel = normalizeLevel(fresh, levelIndex, current);
    const nextLevels = levels.map((level) => (level.id === freshLevel.id ? freshLevel : level));
    const nextQuestions = [...allQuestions.filter((question) => question.levelId !== freshLevel.id), ...freshLevel.questions];
    levels.splice(0, levels.length, ...nextLevels);
    allQuestions.splice(0, allQuestions.length, ...nextQuestions);
  });
  const loaded = normalizeLevel(raw, levelIndex, current);
  const nextLevels = levels.map((level) => (level.id === loaded.id ? loaded : level));
  const nextQuestions = [...allQuestions.filter((question) => question.levelId !== loaded.id), ...loaded.questions];

  levels.splice(0, levels.length, ...nextLevels);
  allQuestions.splice(0, allQuestions.length, ...nextQuestions);
  return loaded;
};

export const getLevelQuestionCount = (level: Level) => level.questionCount ?? level.questions.length;

export const getLevel = (levelId: LevelId) => levels.find((level) => level.id === levelId) ?? levels[0];

export const getLevelSourceUrl = (levelId: LevelId) => remoteUrl(getLevel(levelId).sourcePath);

export const getQuestion = (levelId: LevelId, questionId?: string) => {
  const level = getLevel(levelId);
  return level.questions.find((question) => question.id === questionId) ?? level.questions[0];
};

export const getNextQuestion = (levelId: LevelId, questionId: string) => {
  const level = getLevel(levelId);
  const currentIndex = level.questions.findIndex((question) => question.id === questionId);
  return level.questions[currentIndex + 1] ?? level.questions[0];
};
