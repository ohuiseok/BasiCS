import React, { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ProgressBar } from '../components/ProgressBar';
import { Screen } from '../components/Screen';
import { StatCard } from '../components/StatCard';
import { getLearningDomainProgress, getLearningStats } from '../data/contentData';
import { getDeveloperCharacterPair, getDeveloperYear } from '../data/developerCharacters';
import { allQuestions, levels } from '../data/rawData';
import { getOverallStats, useStudy } from '../state/StudyContext';
import { colors, radii } from '../theme';

type Segment = 'learning' | 'problem';

type ActivityDay = {
  date: string;
  learning: number;
  problem: number;
  total: number;
};

const getDateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getMonthLabel = (date: Date) => `${date.getFullYear()}년 ${date.getMonth() + 1}월`;

const getMonthKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

const addMonths = (date: Date, amount: number) => new Date(date.getFullYear(), date.getMonth() + amount, 1);

const getCalendarDays = (month: Date) => {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const leadingBlanks = firstDay.getDay();
  return [
    ...Array.from({ length: leadingBlanks }, () => undefined),
    ...Array.from({ length: daysInMonth }, (_, index) => new Date(month.getFullYear(), month.getMonth(), index + 1)),
  ];
};

const getActivityByDate = (learningDates: Record<string, string>, problemDates: Record<string, string>) => {
  const result: Record<string, ActivityDay> = {};
  const ensureDay = (date: string) => {
    result[date] = result[date] ?? { date, learning: 0, problem: 0, total: 0 };
    return result[date];
  };

  Object.values(learningDates).forEach((date) => {
    const day = ensureDay(date);
    day.learning += 1;
    day.total += 1;
  });

  Object.values(problemDates).forEach((date) => {
    const day = ensureDay(date);
    day.problem += 1;
    day.total += 1;
  });

  return result;
};

export function StatsScreen() {
  const study = useStudy();
  const [segment, setSegment] = useState<Segment>('learning');
  const [visibleMonth, setVisibleMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => getDateKey());
  const problemStats = getOverallStats(study.statuses);
  const learningStats = getLearningStats(study.learningProgress, study.learningBookmarks);
  const learningRows = getLearningDomainProgress(study.learningProgress);
  const learningRatio = learningStats.total ? learningStats.read / learningStats.total : 0;
  const problemRatio = problemStats.total ? problemStats.completed / problemStats.total : 0;
  const developerYear = getDeveloperYear(learningRatio, problemRatio);
  const developerCharacters = getDeveloperCharacterPair(developerYear);
  const todayKey = getDateKey();

  const activityByDate = useMemo(() => getActivityByDate(study.studiedLearningDates, study.studiedQuestionDates), [study.studiedLearningDates, study.studiedQuestionDates]);
  const calendarDays = useMemo(() => getCalendarDays(visibleMonth), [visibleMonth]);
  const selectedActivity = activityByDate[selectedDate] ?? { date: selectedDate, learning: 0, problem: 0, total: 0 };
  const currentMonthKey = getMonthKey(visibleMonth);
  const monthActivities = Object.values(activityByDate).filter((day) => day.date.startsWith(currentMonthKey));
  const monthLearningCount = monthActivities.reduce((sum, day) => sum + day.learning, 0);
  const monthProblemCount = monthActivities.reduce((sum, day) => sum + day.problem, 0);
  const monthActiveDays = monthActivities.filter((day) => day.total > 0).length;
  const changeMonth = (amount: number) => {
    const nextMonth = addMonths(visibleMonth, amount);
    setVisibleMonth(nextMonth);
    setSelectedDate(getDateKey(nextMonth));
  };

  const problemDomainRows = useMemo(() => {
    const domains = Array.from(new Set(allQuestions.map((question) => question.domain))).sort((a, b) => {
      const aCount = allQuestions.filter((question) => question.domain === a).length;
      const bCount = allQuestions.filter((question) => question.domain === b).length;
      return bCount - aCount || a.localeCompare(b);
    });

    return domains.map((domain) => {
      const questions = allQuestions.filter((question) => question.domain === domain);
      const completed = questions.filter((question) => study.statuses[question.id] === 'understood').length;
      return {
        label: domain,
        total: questions.length,
        completed,
        ratio: questions.length ? completed / questions.length : 0,
      };
    });
  }, [study.statuses]);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>통계</Text>
        <Text style={styles.subtitle}>학습 진행률과 문제 풀이 성과를 분리해서 봅니다.</Text>

        <View style={styles.characterHeader}>
          <Text style={styles.characterTitle}>성장 캐릭터</Text>
          <Text style={styles.characterDescription}>학습량과 문제 풀이량을 합쳐 현재 연차를 보여줘요.</Text>
        </View>

        <View style={styles.characterStage}>
          {developerCharacters.map((character) => (
            <View key={character.gender} style={styles.characterSlot}>
              <Image source={character.image} style={styles.characterImage} resizeMode="contain" />
              <Text style={styles.characterLabel}>{character.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.calendarHeader}>
          <View>
            <Text style={styles.characterTitle}>월간 활동</Text>
            <Text style={styles.characterDescription}>날짜별 학습과 문제 풀이 기록을 한눈에 봅니다.</Text>
          </View>
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.learningDot]} />
              <Text style={styles.legendText}>학습</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.problemDot]} />
              <Text style={styles.legendText}>문제</Text>
            </View>
          </View>
        </View>

        <View style={styles.calendarPanel}>
          <View style={styles.monthNav}>
            <Pressable accessibilityRole="button" accessibilityLabel="이전 달" style={styles.monthButton} onPress={() => changeMonth(-1)}>
              <Text style={styles.monthButtonText}>{'<'}</Text>
            </Pressable>
            <Text style={styles.monthTitle}>{getMonthLabel(visibleMonth)}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="다음 달" style={styles.monthButton} onPress={() => changeMonth(1)}>
              <Text style={styles.monthButtonText}>{'>'}</Text>
            </Pressable>
          </View>

          <View style={styles.weekRow}>
            {['일', '월', '화', '수', '목', '금', '토'].map((day) => (
              <Text key={day} style={styles.weekText}>
                {day}
              </Text>
            ))}
          </View>

          <View style={styles.calendarGrid}>
            {calendarDays.map((date, index) => {
              const dateKey = date ? getDateKey(date) : `blank-${index}`;
              const activity = date ? activityByDate[dateKey] : undefined;
              const isSelected = dateKey === selectedDate;
              const isToday = dateKey === todayKey;
              const intensityStyle = activity?.total ? (activity.total >= 6 ? styles.dayHigh : activity.total >= 3 ? styles.dayMedium : styles.dayLow) : undefined;

              return (
                <View key={dateKey} style={styles.dayWrap}>
                  {date ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`${date.getMonth() + 1}월 ${date.getDate()}일 활동`}
                      style={[styles.dayCell, intensityStyle, isToday && styles.todayCell, isSelected && styles.selectedDayCell]}
                      onPress={() => setSelectedDate(dateKey)}
                    >
                      <Text style={[styles.dayText, isSelected && styles.selectedDayText]}>{date.getDate()}</Text>
                      <View style={styles.dayDots}>
                        {activity?.learning ? <View style={[styles.activityDot, styles.learningDot]} /> : null}
                        {activity?.problem ? <View style={[styles.activityDot, styles.problemDot]} /> : null}
                      </View>
                    </Pressable>
                  ) : (
                    <View style={styles.emptyDayCell} />
                  )}
                </View>
              );
            })}
          </View>

          <View style={styles.activitySummary}>
            <View>
              <Text style={styles.summaryDate}>{selectedDate.replace(/-/g, '.')}</Text>
              <Text style={styles.summaryText}>
                학습 {selectedActivity.learning}개 · 문제 {selectedActivity.problem}개 · 총 {selectedActivity.total}개
              </Text>
            </View>
            <Text style={styles.monthSummary}>
              이번 달 {monthLearningCount + monthProblemCount}개 · {monthActiveDays}일
            </Text>
          </View>
        </View>

        <View style={styles.segment}>
          <Pressable style={[styles.segmentButton, segment === 'learning' && styles.segmentActive]} onPress={() => setSegment('learning')}>
            <Text style={[styles.segmentText, segment === 'learning' && styles.segmentTextActive]}>학습</Text>
          </Pressable>
          <Pressable style={[styles.segmentButton, segment === 'problem' && styles.segmentActive]} onPress={() => setSegment('problem')}>
            <Text style={[styles.segmentText, segment === 'problem' && styles.segmentTextActive]}>문제</Text>
          </Pressable>
        </View>

        {segment === 'learning' ? (
          <>
            <View style={styles.cards}>
              <StatCard value={String(learningStats.read)} label="읽은 챕터" />
              <StatCard value={String(learningStats.saved)} label="저장한 학습" color={colors.orange} />
              <StatCard value={`${study.streakDays}일`} label="연속 학습" color={colors.teal} />
            </View>
            <Text style={styles.sectionTitle}>학습 도메인</Text>
            <View style={styles.panel}>
              <View style={styles.innerList}>
                {learningRows.map((row) => (
                  <View key={row.label} style={styles.row}>
                    <Text style={styles.label} numberOfLines={1}>
                      {row.label}
                    </Text>
                    <View style={styles.rowBar}>
                      <ProgressBar ratio={row.ratio} color={colors.primary} />
                    </View>
                    <Text style={styles.percent}>{Math.round(row.ratio * 100)}%</Text>
                  </View>
                ))}
              </View>
            </View>
          </>
        ) : (
          <>
            <View style={styles.cards}>
              <StatCard value={String(problemStats.completed)} label="완료 문제" />
              <StatCard value={`${problemStats.understanding}%`} label="이해했어요" color={colors.teal} />
              <StatCard value={String(Object.keys(study.bookmarks).length)} label="문제 북마크" color={colors.orange} />
            </View>
            <Text style={styles.sectionTitle}>레벨별 문제 진행률</Text>
            <View style={styles.panel}>
              <View style={styles.innerList}>
                {levels.map((level) => {
                  const progress = study.getLevelProgress(level.id);
                  return (
                    <View key={level.id} style={styles.row}>
                      <Text style={styles.label}>{level.label}</Text>
                      <View style={styles.rowBar}>
                        <ProgressBar ratio={progress.ratio} color={level.id === 'beginner' ? colors.teal : colors.primary} />
                      </View>
                      <Text style={styles.percent}>{Math.round(progress.ratio * 100)}%</Text>
                    </View>
                  );
                })}
              </View>
            </View>
            <Text style={styles.sectionTitle}>도메인별 이해도</Text>
            <View style={styles.panel}>
              <View style={styles.innerList}>
                {problemDomainRows.map((row) => (
                  <View key={row.label} style={styles.row}>
                    <Text style={styles.label} numberOfLines={1}>
                      {row.label}
                    </Text>
                    <View style={styles.rowBar}>
                      <ProgressBar ratio={row.ratio} color={row.ratio < 0.4 ? colors.red : colors.primary} />
                    </View>
                    <Text style={styles.percent}>{Math.round(row.ratio * 100)}%</Text>
                  </View>
                ))}
              </View>
            </View>
          </>
        )}
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
    color: colors.muted,
    fontSize: 13,
    lineHeight: 20,
  },
  characterHeader: {
    marginTop: 28,
  },
  characterTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  characterDescription: {
    marginTop: 5,
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  characterStage: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 18,
    marginTop: 16,
  },
  characterSlot: {
    flex: 1,
    alignItems: 'center',
  },
  characterImage: {
    width: 132,
    height: 132,
  },
  characterLabel: {
    marginTop: 6,
    color: colors.text,
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 30,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 2,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  legendText: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '800',
  },
  calendarPanel: {
    marginTop: 14,
    padding: 14,
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.line,
  },
  monthNav: {
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
    backgroundColor: colors.primarySoft,
  },
  monthButtonText: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: '900',
  },
  monthTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  weekRow: {
    flexDirection: 'row',
    marginTop: 12,
  },
  weekText: {
    width: '14.2857%',
    color: colors.faint,
    fontSize: 10,
    fontWeight: '900',
    textAlign: 'center',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  dayWrap: {
    width: '14.2857%',
    padding: 3,
  },
  dayCell: {
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: '#F8FAFC',
  },
  emptyDayCell: {
    aspectRatio: 1,
  },
  dayLow: {
    backgroundColor: '#EFF6FF',
  },
  dayMedium: {
    backgroundColor: '#DBEAFE',
  },
  dayHigh: {
    backgroundColor: '#BFDBFE',
  },
  todayCell: {
    borderColor: colors.primary,
  },
  selectedDayCell: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dayText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '900',
  },
  selectedDayText: {
    color: '#FFFFFF',
  },
  dayDots: {
    position: 'absolute',
    bottom: 5,
    flexDirection: 'row',
    gap: 3,
  },
  activityDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  learningDot: {
    backgroundColor: colors.primary,
  },
  problemDot: {
    backgroundColor: colors.orange,
  },
  activitySummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 14,
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: radii.lg,
  },
  summaryDate: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '900',
  },
  summaryText: {
    marginTop: 4,
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800',
  },
  monthSummary: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '900',
    textAlign: 'right',
  },
  segment: {
    height: 48,
    flexDirection: 'row',
    gap: 6,
    marginTop: 22,
    marginBottom: 22,
    padding: 5,
    backgroundColor: '#E2E8F0',
    borderRadius: radii.pill,
  },
  segmentButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
  },
  segmentActive: {
    backgroundColor: colors.primary,
  },
  segmentText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '900',
  },
  segmentTextActive: {
    color: '#FFFFFF',
  },
  cards: {
    flexDirection: 'row',
    gap: 10,
  },
  sectionTitle: {
    marginTop: 28,
    marginBottom: 14,
    color: colors.text,
    fontSize: 17,
    fontWeight: '900',
  },
  panel: {
    padding: 22,
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.line,
  },
  innerList: {
    gap: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  label: {
    width: 94,
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
  },
  rowBar: {
    flex: 1,
    height: 8,
  },
  percent: {
    width: 38,
    color: colors.muted,
    fontSize: 11,
    textAlign: 'right',
  },
});
