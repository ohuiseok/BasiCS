import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ChevronRight, Layers3 } from 'lucide-react-native';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ProgressBar } from '../components/ProgressBar';
import { Screen } from '../components/Screen';
import { getLearningDomain, learningItems } from '../data/contentData';
import { useStudy } from '../state/StudyContext';
import { colors, radii } from '../theme';
import { LearningStackParamList } from '../types';

type Props = NativeStackScreenProps<LearningStackParamList, 'LearningDomain'>;

export function LearningDomainScreen({ navigation, route }: Props) {
  const study = useStudy();
  const domain = getLearningDomain(route.params.domainFolder);
  const domainItems = learningItems.filter((item) => item.domainLabel === domain.domainLabel);
  const completed = domainItems.filter((item) => study.learningProgress[item.id]).length;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View>
          <Text style={styles.title}>{domain.domainLabel}</Text>
          <Text style={styles.subtitle}>
            {completed} / {domainItems.length} 완료
          </Text>
        </View>
        <View style={styles.progress}>
          <ProgressBar ratio={completed / Math.max(domainItems.length, 1)} color={colors.teal} />
        </View>

        <View style={styles.list}>
          {domain.topics.map((topic) => {
            const items = learningItems.filter((item) => item.domainLabel === topic.domainLabel && item.topicLabel === topic.topicLabel);
            const done = items.filter((item) => study.learningProgress[item.id]).length;
            return (
              <Pressable
                key={topic.topicFolder}
                style={styles.item}
                onPress={() => navigation.navigate('LearningTopic', { domainFolder: domain.domainFolder, topicFolder: topic.topicFolder })}
              >
                <View style={styles.icon}>
                  <Layers3 size={21} color={colors.primary} />
                </View>
                <View style={styles.itemMain}>
                  <Text style={styles.itemTitle} numberOfLines={2}>
                    {topic.topicLabel}
                  </Text>
                  <Text style={styles.itemMeta}>
                    {done} / {items.length} 챕터
                  </Text>
                </View>
                <ChevronRight size={20} color={colors.faint} />
              </Pressable>
            );
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
    gap: 18,
  },
  title: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '900',
  },
  subtitle: {
    marginTop: 8,
    color: colors.muted,
    fontSize: 13,
    fontWeight: '800',
  },
  progress: {
    height: 8,
  },
  list: {
    gap: 12,
  },
  item: {
    minHeight: 94,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.line,
  },
  icon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: 21,
  },
  itemMain: {
    flex: 1,
    gap: 8,
  },
  itemTitle: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '900',
  },
  itemMeta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
  },
});
