import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BookmarkCheck, CheckCircle2, ChevronRight } from 'lucide-react-native';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Chip } from '../components/Chip';
import { Screen } from '../components/Screen';
import { foundationItems } from '../data/contentData';
import { useStudy } from '../state/StudyContext';
import { colors, radii } from '../theme';
import { LearningStackParamList } from '../types';

type Props = NativeStackScreenProps<LearningStackParamList, 'LearningFoundation'>;

export function LearningFoundationScreen({ navigation }: Props) {
  const study = useStudy();
  const completed = foundationItems.filter((item) => study.learningProgress[item.id]).length;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View>
          <Text style={styles.title}>기초 챕터</Text>
          <Text style={styles.subtitle}>
            {completed} / {foundationItems.length} 완료
          </Text>
        </View>

        <View style={styles.list}>
          {foundationItems.map((item, index) => {
            const read = Boolean(study.learningProgress[item.id]);
            const bookmarked = study.isLearningBookmarked(item.id);
            return (
              <Pressable key={item.id} style={styles.item} onPress={() => navigation.navigate('LearningReader', { itemId: item.id })}>
                <View style={styles.number}>
                  <Text style={styles.numberText}>{index + 1}</Text>
                </View>
                <View style={styles.itemMain}>
                  <View style={styles.chips}>
                    <Chip label={read ? '완료' : '기초'} tone={read ? 'teal' : 'neutral'} />
                    {bookmarked ? <BookmarkCheck size={18} color={colors.primary} fill={colors.primary} /> : null}
                  </View>
                  <Text style={styles.itemTitle} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <Text style={styles.itemMeta} numberOfLines={1}>
                    {item.subtitle}
                  </Text>
                </View>
                {read ? <CheckCircle2 size={20} color={colors.teal} /> : <ChevronRight size={20} color={colors.faint} />}
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
  list: {
    gap: 12,
  },
  item: {
    minHeight: 106,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.line,
  },
  number: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: 17,
  },
  numberText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '900',
  },
  itemMain: {
    flex: 1,
    alignItems: 'flex-start',
    gap: 8,
  },
  chips: {
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemTitle: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '900',
  },
  itemMeta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
});
