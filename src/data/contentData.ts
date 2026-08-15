import { fetchCachedJson, fetchFreshJson, fetchRemoteJson, readCachedJson, writeCachedJson } from './remoteCache';
import seedContentIndex from './seedContentIndex.json';

export type LearningTerm = {
  plain?: string;
  formal?: string;
  description?: string;
};

export type LearningDiagram = {
  title?: string;
  mermaid?: string;
  animationSteps?: string[][];
};

export type LearningSource = {
  title?: string;
  url?: string;
  thumbnail?: string;
};

type LearningSources = {
  web?: LearningSource[];
};

type ContentIndex = {
  version?: string;
  foundations: Array<{ id: string; order: number; title: string; path: string }>;
  domains: Array<{
    domainFolder: string;
    domain: string;
    domainLabel: string;
    topics: Array<{
      domainFolder: string;
      topicFolder: string;
      domain: string;
      domainLabel: string;
      topic: string;
      topicLabel: string;
      path: string;
      levels: Array<{ level: string; levelLabel: string; title: string; path: string }>;
    }>;
  }>;
};

type DatasetVersion = {
  version?: string;
};

const CONTENT_VERSION_PATH = 'content/version.json';

type FoundationContent = {
  id: string;
  order?: number;
  title: string;
  content?: string;
  diagrams?: LearningDiagram[];
  newTerms?: LearningTerm[];
  prevChapter?: string | null;
  nextChapter?: string | null;
};

type TopicContent = {
  domain?: string;
  domainLabel?: string;
  topic?: string;
  topicLabel?: string;
  prerequisites?: string[];
  whyNeeded?: string;
  analogy?: string;
  definition?: string;
  mechanism?: string;
  diagrams?: LearningDiagram[];
  baseTerms?: LearningTerm[];
  sources?: LearningSources;
};

type LevelContent = {
  domain?: string;
  topic?: string;
  level?: string;
  levelLabel?: string;
  title: string;
  content?: string;
  diagrams?: LearningDiagram[];
  newTerms?: LearningTerm[];
  misconceptions?: string[];
  selfCheck?: string[];
  coveredQuestions?: Array<{ id?: string; note?: string }>;
  sources?: LearningSources;
};

export type LearningItem = {
  id: string;
  kind: 'foundation' | 'level';
  title: string;
  subtitle: string;
  domainLabel?: string;
  topicLabel?: string;
  levelLabel?: string;
  path: string;
  content: FoundationContent | LevelContent;
  topic?: TopicContent;
};

export const learningItems: LearningItem[] = [];
export const foundationItems: LearningItem[] = [];
export const domainGroups: ContentIndex['domains'] = [];

const files: Record<string, unknown> = {};

const contentPath = (path: string) => `content/${path.replace(/^\/+/, '')}`;

const getFile = <T,>(filePath: string): T => files[filePath] as T;

type JsonLoader = <T>(path: string) => Promise<T>;

const loadLearningData = async (loadJson: JsonLoader) => {
  const index = await loadJson<ContentIndex>('content/content-index.json');

  Object.keys(files).forEach((key) => {
    delete files[key];
  });

  const nextFoundations: LearningItem[] = index.foundations.map((item) => ({
    id: `foundation:${item.id}`,
    kind: 'foundation',
    title: item.title,
    subtitle: `기초 챕터 ${item.order}`,
    path: item.path,
    content: { id: item.id, order: item.order, title: item.title },
  }));

  const nextLevelItems: LearningItem[] = index.domains.flatMap((domain) =>
    domain.topics.flatMap((topic) => {
      return topic.levels.map((level) => ({
        id: `level:${topic.domainFolder}/${topic.topicFolder}/${level.level}`,
        kind: 'level' as const,
        title: level.title,
        subtitle: `${topic.domainLabel} / ${topic.topicLabel} / ${level.levelLabel}`,
        domainLabel: topic.domainLabel,
        topicLabel: topic.topicLabel,
        levelLabel: level.levelLabel,
        path: level.path,
        content: {
          domain: topic.domain,
          topic: topic.topic,
          level: level.level,
          levelLabel: level.levelLabel,
          title: level.title,
        },
      }));
    }),
  );

  foundationItems.splice(0, foundationItems.length, ...nextFoundations);
  learningItems.splice(0, learningItems.length, ...nextFoundations, ...nextLevelItems);
  domainGroups.splice(0, domainGroups.length, ...index.domains);
};

const requireCachedJson = async <T,>(path: string) => {
  const cached = await readCachedJson<T>(path);
  if (cached === undefined) throw new Error(`No cached data for ${path}`);
  return cached;
};

const getContentFilePaths = (index: ContentIndex) => {
  const paths = new Set<string>();

  index.foundations.forEach((item) => {
    paths.add(contentPath(item.path));
  });

  index.domains.forEach((domain) => {
    domain.topics.forEach((topic) => {
      paths.add(contentPath(topic.path));
      topic.levels.forEach((level) => {
        paths.add(contentPath(level.path));
      });
    });
  });

  return [...paths];
};

const hasCachedLearningData = async () => {
  const index = await readCachedJson<ContentIndex>('content/content-index.json');
  if (index === undefined) return false;

  const cachedFiles = await Promise.all(getContentFilePaths(index).map((path) => readCachedJson<unknown>(path)));
  return cachedFiles.every((file) => file !== undefined);
};

const formatSyncFailures = (label: string, failures: Array<{ path: string; error: unknown }>) =>
  `${label} sync failed for ${failures.length} file(s): ${failures
    .slice(0, 12)
    .map((failure) => `${failure.path} (${failure.error instanceof Error ? failure.error.message : String(failure.error)})`)
    .join(', ')}`;

const fetchContentFile = async (path: string) => {
  try {
    await fetchFreshJson<unknown>(path);
    return undefined;
  } catch (error) {
    return { path, error };
  }
};

export const syncLearningData = async () => {
  const remoteVersion = await fetchRemoteJson<DatasetVersion>(CONTENT_VERSION_PATH);
  const cachedVersion = await readCachedJson<DatasetVersion>(CONTENT_VERSION_PATH);
  const isSameVersion = Boolean(remoteVersion.version && remoteVersion.version === cachedVersion?.version);

  if (isSameVersion && (await hasCachedLearningData())) return;

  const index = await fetchFreshJson<ContentIndex>('content/content-index.json');
  const failures = (await Promise.all(getContentFilePaths(index).map(fetchContentFile))).filter(
    (failure): failure is { path: string; error: unknown } => failure !== undefined,
  );
  if (failures.length) throw new Error(formatSyncFailures('Learning data', failures));
  await writeCachedJson(CONTENT_VERSION_PATH, remoteVersion);
};

export const loadCachedLearningData = async () => loadLearningData(requireCachedJson);

export const loadFreshLearningData = async () => loadLearningData(fetchFreshJson);

export const loadRemoteLearningData = async () => {
  return loadLearningData(fetchCachedJson);
};

export const loadSeedLearningData = async () => loadLearningData(async <T,>() => seedContentIndex as T);

export const ensureLearningItemContent = async (itemId?: string) => {
  const item = getLearningItem(itemId);
  if (!item) return undefined;

  if (!files[item.path]) {
    files[item.path] = await fetchCachedJson<unknown>(contentPath(item.path));
  }
  item.content = getFile<FoundationContent | LevelContent>(item.path);

  if (item.kind === 'level') {
    const domainFolder = item.id.split(':')[1]?.split('/')[0];
    const topicFolder = item.id.split(':')[1]?.split('/')[1];
    const topic = getLearningTopic(domainFolder, topicFolder);
    if (topic?.path) {
      if (!files[topic.path]) {
        files[topic.path] = await fetchCachedJson<unknown>(contentPath(topic.path));
      }
      item.topic = getFile<TopicContent>(topic.path);
    }
  }

  return item;
};

export const getLearningItem = (itemId?: string) => learningItems.find((item) => item.id === itemId) ?? learningItems[0];

export const getLearningItemByPath = (filePath?: string) => learningItems.find((item) => item.path === filePath);

export const getLearningDomain = (domainFolder?: string) => domainGroups.find((domain) => domain.domainFolder === domainFolder) ?? domainGroups[0];

export const getLearningTopic = (domainFolder?: string, topicFolder?: string) => {
  const domain = getLearningDomain(domainFolder);
  return domain?.topics.find((topic) => topic.topicFolder === topicFolder) ?? domain?.topics[0];
};

export const getLearningItemsByTopic = (domainFolder?: string, topicFolder?: string) => {
  const topic = getLearningTopic(domainFolder, topicFolder);
  return learningItems.filter((item) => item.domainLabel === topic?.domainLabel && item.topicLabel === topic?.topicLabel);
};

export const getAdjacentLearningItems = (itemId: string) => {
  const index = learningItems.findIndex((item) => item.id === itemId);
  return {
    previous: index > 0 ? learningItems[index - 1] : undefined,
    next: index >= 0 && index < learningItems.length - 1 ? learningItems[index + 1] : undefined,
  };
};

export const getLearningDomainProgress = (completedIds: Record<string, string>) =>
  domainGroups.map((domain) => {
    const items = learningItems.filter((item) => item.domainLabel === domain.domainLabel);
    const completed = items.filter((item) => completedIds[item.id]).length;
    return {
      label: domain.domainLabel,
      completed,
      total: items.length,
      ratio: items.length ? completed / items.length : 0,
    };
  });

export const getLearningStats = (completedIds: Record<string, string>, bookmarks: Record<string, unknown>) => ({
  read: learningItems.filter((item) => completedIds[item.id]).length,
  saved: learningItems.filter((item) => bookmarks[item.id]).length,
  total: learningItems.length,
});
