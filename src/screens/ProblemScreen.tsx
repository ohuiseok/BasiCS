import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { LevelCard } from '../components/LevelCard';
import { Screen } from '../components/Screen';
import { levels } from '../data/rawData';
import { useStudy } from '../state/StudyContext';
import { colors } from '../theme';
import { ProblemStackParamList } from '../types';

type Props = NativeStackScreenProps<ProblemStackParamList, 'ProblemHome'>;

export function ProblemScreen({ navigation }: Props) {
  const study = useStudy();
  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>문제</Text>
        <Text style={styles.subtitle}>현재 문제 풀이 화면을 그대로 사용해 레벨별로 풀어요.</Text>
        <View style={styles.grid}>
          {levels.map((level) => {
            const progress = study.getLevelProgress(level.id);
            return <LevelCard key={level.id} level={level} completed={progress.completed} onPress={() => navigation.navigate('LevelDetail', { levelId: level.id })} />;
          })}
        </View>
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
    marginBottom: 22,
    color: colors.muted,
    fontSize: 13,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 14,
  },
});
