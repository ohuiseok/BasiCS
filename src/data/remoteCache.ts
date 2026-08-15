import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';

export const S3_BASE_URL = 'https://cs-basics.s3.ap-northeast-2.amazonaws.com';

const CACHE_PREFIX = 'cs-basics:remote-json:v1:';
const CACHE_DIR = FileSystem.documentDirectory ? `${FileSystem.documentDirectory}remote-json-v2/` : undefined;
const FETCH_TIMEOUT_MS = 8000;

type CachedJson = {
  savedAt: number;
  value: unknown;
};

export const remoteUrl = (path: string) => `${S3_BASE_URL}/${path.replace(/^\/+/, '')}`;

const cacheKey = (path: string) => `${CACHE_PREFIX}${path.replace(/^\/+/, '')}`;

const cacheFileName = (path: string) => encodeURIComponent(path.replace(/^\/+/, '').replace(/[\\/]/g, '__'));

const cacheFileUri = (path: string) => (CACHE_DIR ? `${CACHE_DIR}${cacheFileName(path)}.json` : undefined);

const ensureCacheDir = async () => {
  if (!CACHE_DIR) return false;
  const info = await FileSystem.getInfoAsync(CACHE_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
  }
  return true;
};

const fetchWithTimeout = async (url: string) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
};

export const readCachedJson = async <T,>(path: string): Promise<T | undefined> => {
  const fileUri = cacheFileUri(path);
  if (fileUri) {
    try {
      const info = await FileSystem.getInfoAsync(fileUri);
      if (info.exists) {
        const cached = await FileSystem.readAsStringAsync(fileUri);
        const parsed = JSON.parse(cached) as CachedJson;
        return parsed.value as T;
      }
    } catch {
      // Fall through to the legacy AsyncStorage cache.
    }
  }

  const cached = await AsyncStorage.getItem(cacheKey(path));
  if (!cached) return undefined;

  try {
    const parsed = JSON.parse(cached) as CachedJson;
    return parsed.value as T;
  } catch {
    await AsyncStorage.removeItem(cacheKey(path));
    return undefined;
  }
};

export const writeCachedJson = async (path: string, value: unknown) => {
  const payload: CachedJson = {
    savedAt: Date.now(),
    value,
  };
  if (await ensureCacheDir()) {
    await FileSystem.writeAsStringAsync(cacheFileUri(path)!, JSON.stringify(payload));
    return;
  }
  await AsyncStorage.setItem(cacheKey(path), JSON.stringify(payload));
};

export const fetchRemoteJson = async <T,>(path: string): Promise<T> => {
  const response = await fetchWithTimeout(remoteUrl(path));
  if (!response.ok) {
    throw new Error(`Failed to load ${path}: ${response.status}`);
  }

  try {
    return (await response.json()) as T;
  } catch (error) {
    throw new Error(`Failed to parse ${path}: ${error instanceof Error ? error.message : String(error)}`);
  }
};

export const fetchFreshJson = async <T,>(path: string): Promise<T> => {
  const json = await fetchRemoteJson<T>(path);
  await writeCachedJson(path, json);
  return json;
};

export const fetchCachedJson = async <T,>(path: string): Promise<T> => {
  try {
    return await fetchFreshJson<T>(path);
  } catch (error) {
    const cached = await readCachedJson<T>(path);
    if (cached !== undefined) return cached;
    throw error;
  }
};

export const fetchCacheFirstJson = async <T,>(path: string, onFresh?: (value: T) => void): Promise<T> => {
  const cached = await readCachedJson<T>(path);
  if (cached !== undefined) {
    fetchFreshJson<T>(path)
      .then((fresh) => onFresh?.(fresh))
      .catch(() => undefined);
    return cached;
  }

  return fetchFreshJson<T>(path);
};
