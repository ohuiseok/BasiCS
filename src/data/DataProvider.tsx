import React, { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii } from '../theme';
import { loadCachedLearningData, loadRemoteLearningData, loadSeedLearningData, syncLearningData } from './contentData';
import { loadCachedProblemIndexData, loadRemoteProblemData, loadSeedProblemData, loadSyncedProblemData, syncProblemData } from './rawData';

type DataContextValue = {
  isDataReady: boolean;
  dataVersion: number;
  reloadData: () => Promise<void>;
};

const DataContext = createContext<DataContextValue | undefined>(undefined);
const LOAD_ERROR_MESSAGE = '데이터를 불러오지 못했습니다. 네트워크 상태를 확인한 뒤 다시 시도해 주세요.';

const syncDataInBackground = async (onReady: () => void) => {
  await Promise.all([syncProblemData(), syncLearningData()]);
  await Promise.all([loadSyncedProblemData(), loadRemoteLearningData()]);
  onReady();
};

export function DataProvider({ children }: PropsWithChildren) {
  const [isDataReady, setIsDataReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const [dataVersion, setDataVersion] = useState(0);

  const markDataReady = useCallback(() => {
    setIsDataReady(true);
    setDataVersion((current) => current + 1);
  }, []);

  const reloadData = useCallback(async () => {
    setIsLoading(true);
    setError(undefined);
    try {
      await Promise.all([loadRemoteProblemData(), loadRemoteLearningData()]);
      markDataReady();
      syncDataInBackground(markDataReady).catch((error) => console.warn('Failed to sync data in background.', error));
    } catch (nextError) {
      console.warn('Failed to reload remote data.', nextError);
      try {
        await Promise.all([loadSeedProblemData(), loadSeedLearningData()]);
        markDataReady();
        syncDataInBackground(markDataReady).catch((error) => console.warn('Failed to sync data in background.', error));
      } catch {
        setError(LOAD_ERROR_MESSAGE);
      }
    } finally {
      setIsLoading(false);
    }
  }, [markDataReady]);

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      setIsLoading(true);
      setError(undefined);

      try {
        await Promise.all([loadSeedProblemData(), loadSeedLearningData()]);
        if (!mounted) return;
        markDataReady();
        setIsLoading(false);
        Promise.all([loadRemoteProblemData(), loadRemoteLearningData()])
          .then(() => {
            if (mounted) markDataReady();
            return syncDataInBackground(() => {
              if (mounted) markDataReady();
            });
          })
          .catch((error) => console.warn('Failed to sync data in background.', error));
        return;
      } catch {
        // Fall back to cached data when the version check cannot reach the server.
      }

      try {
        await Promise.all([loadCachedProblemIndexData(), loadCachedLearningData()]);
        if (!mounted) return;
        markDataReady();
        setError(undefined);
      } catch (nextError) {
        if (!mounted) return;
        console.warn('Failed to load remote or cached data.', nextError);
        setIsDataReady(false);
        setError(LOAD_ERROR_MESSAGE);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, [markDataReady]);

  const value = useMemo<DataContextValue>(
    () => ({ isDataReady, dataVersion, reloadData }),
    [dataVersion, isDataReady, reloadData],
  );

  if (!isDataReady) {
    return (
      <View style={styles.screen}>
        <View style={styles.card}>
          {isLoading ? <ActivityIndicator color={colors.primary} /> : null}
          <Text style={styles.title}>{isLoading ? '데이터 로딩 중' : '데이터 로딩 실패'}</Text>
          <Text style={styles.copy}>{error ?? '학습 데이터와 문제 데이터를 준비하고 있습니다.'}</Text>
          {!isLoading ? (
            <Pressable style={styles.button} onPress={reloadData}>
              <Text style={styles.buttonText}>다시 시도</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    );
  }

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within DataProvider');
  return context;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: colors.bg,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    padding: 24,
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.line,
  },
  title: {
    marginTop: 14,
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  copy: {
    marginTop: 8,
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  button: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    paddingHorizontal: 24,
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
});
