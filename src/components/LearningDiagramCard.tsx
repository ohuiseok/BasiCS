import { Pause, Play, RotateCcw, SkipBack, SkipForward } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { LearningDiagram } from '../data/contentData';
import { MermaidDiagram } from '../screens/AnswerScreen';
import { colors, radii } from '../theme';

type Props = {
  diagram: LearningDiagram;
};

const normalizeMermaid = (value?: string) =>
  (value ?? '')
    .trim()
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'");

export function LearningDiagramCard({ diagram }: Props) {
  const mermaid = normalizeMermaid(diagram.mermaid);
  const steps = useMemo(
    () => (Array.isArray(diagram.animationSteps) ? diagram.animationSteps.filter((step) => Array.isArray(step) && step.length > 0) : []),
    [diagram.animationSteps],
  );
  const [stepIndex, setStepIndex] = useState(steps.length ? 0 : -1);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    setStepIndex(steps.length ? 0 : -1);
    setPlaying(false);
  }, [steps.length, mermaid]);

  useEffect(() => {
    if (!playing || steps.length <= 1) return undefined;
    const timer = setInterval(() => {
      setStepIndex((current) => {
        const next = current + 1;
        if (next >= steps.length) {
          setPlaying(false);
          return current;
        }
        return next;
      });
    }, 900);
    return () => clearInterval(timer);
  }, [playing, steps.length]);

  if (!mermaid) return null;

  const hasAnimation = steps.length > 1;
  const activeStep = hasAnimation ? steps[Math.max(0, stepIndex)] : undefined;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{diagram.title ?? 'Diagram'}</Text>
      <MermaidDiagram diagram={mermaid} highlightNodeIds={activeStep} animationSteps={steps} />
      {hasAnimation ? (
        <View style={styles.controls}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="처음 단계"
            style={styles.iconButton}
            onPress={() => {
              setPlaying(false);
              setStepIndex(0);
            }}
          >
            <RotateCcw size={17} color={colors.primary} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="이전 단계"
            disabled={stepIndex <= 0}
            style={[styles.iconButton, stepIndex <= 0 && styles.iconButtonDisabled]}
            onPress={() => {
              setPlaying(false);
              setStepIndex((current) => Math.max(0, current - 1));
            }}
          >
            <SkipBack size={17} color={stepIndex <= 0 ? colors.faint : colors.primary} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={playing ? '일시정지' : '재생'}
            style={[styles.playButton, playing && styles.playButtonActive]}
            onPress={() => {
              if (stepIndex >= steps.length - 1) setStepIndex(0);
              setPlaying((current) => !current);
            }}
          >
            {playing ? <Pause size={18} color="#FFFFFF" /> : <Play size={18} color="#FFFFFF" fill="#FFFFFF" />}
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="다음 단계"
            disabled={stepIndex >= steps.length - 1}
            style={[styles.iconButton, stepIndex >= steps.length - 1 && styles.iconButtonDisabled]}
            onPress={() => {
              setPlaying(false);
              setStepIndex((current) => Math.min(steps.length - 1, current + 1));
            }}
          >
            <SkipForward size={17} color={stepIndex >= steps.length - 1 ? colors.faint : colors.primary} />
          </Pressable>
          <Text style={styles.stepText}>
            {stepIndex + 1} / {steps.length}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
  },
  title: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '900',
  },
  controls: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  iconButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 19,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  iconButtonDisabled: {
    backgroundColor: '#F1F5F9',
    borderColor: colors.line,
  },
  playButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 22,
  },
  playButtonActive: {
    backgroundColor: colors.navy,
  },
  stepText: {
    marginLeft: 'auto',
    color: colors.muted,
    fontSize: 12,
    fontWeight: '900',
  },
});
