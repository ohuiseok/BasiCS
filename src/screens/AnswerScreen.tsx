import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ChevronLeft, ChevronRight, ExternalLink, Maximize2, X } from 'lucide-react-native';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';
import Svg, { Defs, Line, Marker, Path, Polygon, Rect, Text as SvgText } from 'react-native-svg';

import { getLevel, getLevelQuestionCount, getNextQuestion, getQuestion } from '../data/rawData';
import { useStudy } from '../state/StudyContext';
import { colors, radii } from '../theme';
import { RootStackParamList } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Answer'>;

type DiagramNode = {
  id: string;
  label: string;
  shape: 'rect' | 'round' | 'decision' | 'db';
};

type DiagramEdge = {
  from: string;
  to: string;
  label?: string;
  dashed: boolean;
};

const diagramPalette = ['#DBEAFE', '#CCFBF1', '#FEF3C7', '#FEE2E2', '#E0E7FF'];

const normalizeDiagramText = (value: string) =>
  value
    .trim()
    .replace(/^["']|["']$/g, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'");

const wrapSvgText = (text: string, maxChars: number) => {
  const lines: string[] = [];

  text.split(/\r?\n/).forEach((segment) => {
    const words = segment.replace(/_/g, '_\u200b').split(/[^\S\r\n]+/).filter(Boolean);
    let current = '';

    words.forEach((word) => {
      const chunks = Array.from(word).reduce<string[]>((result, char) => {
        const last = result[result.length - 1] ?? '';
        if (last.length >= maxChars) {
          result.push(char);
        } else if (result.length) {
          result[result.length - 1] = `${last}${char}`;
        } else {
          result.push(char);
        }
        return result;
      }, []);

      chunks.forEach((chunk, chunkIndex) => {
        const next = current ? `${current}${chunkIndex === 0 ? ' ' : ''}${chunk}` : chunk;
        if (next.length > maxChars && current) {
          lines.push(current);
          current = chunk;
        } else {
          current = next;
        }
      });
    });

    if (current) lines.push(current);
  });

  return lines.length ? lines.slice(0, 4) : [text];
};

const stripGraphDecorators = (value: string) =>
  value
    .trim()
    .replace(/;$/g, '')
    .replace(/:::[A-Za-z0-9_-]+$/g, '')
    .trim();

const parseGraphNode = (raw: string): DiagramNode => {
  const token = stripGraphDecorators(raw).replace(/^[&\s]+|[&\s]+$/g, '');
  const dbMatch = token.match(/^([A-Za-z0-9_]+)\[\((.+)\)\]$/);
  if (dbMatch) return { id: dbMatch[1], label: normalizeDiagramText(dbMatch[2]), shape: 'db' };

  const decisionMatch = token.match(/^([A-Za-z0-9_]+)\{(.+)\}$/);
  if (decisionMatch) return { id: decisionMatch[1], label: normalizeDiagramText(decisionMatch[2]), shape: 'decision' };

  const labelledMatch = token.match(/^([A-Za-z0-9_]+)\[(.+)\]$/);
  if (labelledMatch) return { id: labelledMatch[1], label: normalizeDiagramText(labelledMatch[2]), shape: 'round' };

  const roundedMatch = token.match(/^([A-Za-z0-9_]+)\((.+)\)$/);
  if (roundedMatch) return { id: roundedMatch[1], label: normalizeDiagramText(roundedMatch[2]), shape: 'round' };

  const bareMatch = token.match(/^([A-Za-z0-9_]+)$/);
  const id = bareMatch ? bareMatch[1] : token.replace(/[^A-Za-z0-9_]/g, '_');
  return { id, label: id, shape: 'round' };
};

const edgeTokenPattern = /\s*(?:-->\|([^|]+)\||--\|([^|]+)\|-->|--\s+(.+?)\s+-->|-\.\s+(.+?)\s+\.->|-->|-\.->|==>|---)\s*/g;

const splitGraphEdgeStatement = (line: string) => {
  const nodes: string[] = [];
  const edges: Array<{ label?: string; dashed: boolean }> = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  edgeTokenPattern.lastIndex = 0;
  while ((match = edgeTokenPattern.exec(line)) !== null) {
    nodes.push(line.slice(lastIndex, match.index).trim());
    edges.push({
      label: normalizeDiagramText(match[1] ?? match[2] ?? match[3] ?? match[4] ?? ''),
      dashed: match[0].includes('-.'),
    });
    lastIndex = match.index + match[0].length;
  }

  if (!edges.length) return undefined;

  nodes.push(line.slice(lastIndex).trim());
  if (nodes.length !== edges.length + 1 || nodes.some((node) => !node)) return undefined;

  return { nodes, edges };
};

const parseGraphDiagram = (diagram: string) => {
  const nodes = new Map<string, DiagramNode>();
  const edges: DiagramEdge[] = [];

  diagram
    .split('\n')
    .flatMap((line) => line.split(';'))
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      if (/^(graph|flowchart)\s+/i.test(line) || /^subgraph\s+/i.test(line) || /^end$/i.test(line)) return;
      if (/^(classDef|class|style|linkStyle|click)\s+/i.test(line)) return;

      const statement = splitGraphEdgeStatement(line);
      if (!statement) {
        const node = parseGraphNode(line);
        nodes.set(node.id, nodes.get(node.id) ?? node);
        return;
      }

      statement.nodes.map(parseGraphNode).forEach((node) => nodes.set(node.id, nodes.get(node.id) ?? node));
      statement.edges.forEach((edge, index) => {
        const from = parseGraphNode(statement.nodes[index]);
        const to = parseGraphNode(statement.nodes[index + 1]);
        edges.push({ from: from.id, to: to.id, label: edge.label || undefined, dashed: edge.dashed });
      });
    });

  return { nodes: Array.from(nodes.values()), edges };
};

const getLayerDepths = (nodes: DiagramNode[], edges: DiagramEdge[]) => {
  const incoming = new Map<string, number>();
  edges.forEach((edge) => incoming.set(edge.to, (incoming.get(edge.to) ?? 0) + 1));

  const depths = new Map<string, number>();
  nodes.forEach((node) => depths.set(node.id, incoming.has(node.id) ? 1 : 0));
  for (let i = 0; i < nodes.length + edges.length; i += 1) {
    edges.forEach((edge) => {
      const nextDepth = (depths.get(edge.from) ?? 0) + 1;
      if (nextDepth > (depths.get(edge.to) ?? 0)) depths.set(edge.to, nextDepth);
    });
  }

  return depths;
};

const getGraphLayers = (nodes: DiagramNode[], edges: DiagramEdge[]) => {
  const depths = getLayerDepths(nodes, edges);
  const result = new Map<number, DiagramNode[]>();
  nodes.forEach((node) => {
    const depth = Math.min(depths.get(node.id) ?? 0, 7);
    result.set(depth, [...(result.get(depth) ?? []), node]);
  });
  return Array.from(result.entries()).sort(([a], [b]) => a - b);
};

const getGraphLayout = (nodes: DiagramNode[], edges: DiagramEdge[]) => {
  const layers = getGraphLayers(nodes, edges);
  const maxLayerSize = Math.max(1, ...layers.map(([, layerNodes]) => layerNodes.length));
  const width = Math.max(760, maxLayerSize * 236 + 88);
  const rowHeight = 126;
  const boxWidth = 194;
  const boxHeight = 70;
  const height = Math.max(220, layers.length * rowHeight + 56);

  return { layers, width, rowHeight, boxWidth, boxHeight, height };
};

const GraphDiagram = ({ diagram, expanded = false, highlightNodeIds }: { diagram: string; expanded?: boolean; highlightNodeIds?: string[] }) => {
  const { nodes, edges } = useMemo(() => parseGraphDiagram(diagram), [diagram]);
  const highlightSet = useMemo(() => new Set(highlightNodeIds ?? []), [highlightNodeIds]);
  const hasHighlights = highlightSet.size > 0;
  const { layers, width, rowHeight, boxWidth, boxHeight, height } = useMemo(() => getGraphLayout(nodes, edges), [nodes, edges]);
  const positions = new Map<string, { x: number; y: number }>();
  layers.forEach(([depth, layerNodes]) => {
    const gap = width / (layerNodes.length + 1);
    layerNodes.forEach((node, index) => {
      positions.set(node.id, { x: gap * (index + 1), y: 52 + depth * rowHeight });
    });
  });

  if (!nodes.length) {
    return <Text style={styles.diagramFallbackText}>{diagram}</Text>;
  }

  const renderedHeight = expanded ? height : Math.min(420, height);

  return (
      <Svg width={width} height={renderedHeight} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          <Marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
            <Polygon points="0,0 8,4 0,8" fill="#94A3B8" />
          </Marker>
        </Defs>
        {edges.map((edge, edgeIndex) => {
          const from = positions.get(edge.from);
          const to = positions.get(edge.to);
          if (!from || !to) return null;
          const active = !hasHighlights || (highlightSet.has(edge.from) && highlightSet.has(edge.to));
          const startY = from.y + boxHeight / 2;
          const endY = to.y - boxHeight / 2;
          const midY = (startY + endY) / 2;
          const path = `M ${from.x} ${startY} C ${from.x} ${midY}, ${to.x} ${midY}, ${to.x} ${endY}`;
          const edgeLabelLines = edge.label ? wrapSvgText(edge.label, 18).slice(0, 2) : [];
          return (
            <React.Fragment key={`${edge.from}-${edge.to}-${edgeIndex}`}>
              <Path d={path} stroke={active ? '#2563EB' : '#CBD5E1'} strokeWidth={active ? 2.8 : 1.5} opacity={active ? 1 : 0.35} fill="none" strokeDasharray={edge.dashed ? '7 7' : undefined} markerEnd="url(#arrow)" />
              {edgeLabelLines.length ? (
                <React.Fragment>
                  <Rect x={(from.x + to.x) / 2 - 74} y={midY - 28} width={148} height={edgeLabelLines.length * 18 + 10} rx={10} fill="#F8FAFC" opacity={active ? 0.92 : 0.72} />
                  {edgeLabelLines.map((line, lineIndex) => (
                    <SvgText key={`${edge.from}-${edge.to}-label-${lineIndex}`} x={(from.x + to.x) / 2} y={midY - 10 + lineIndex * 17} textAnchor="middle" fill={active ? '#1D4ED8' : '#94A3B8'} opacity={active ? 1 : 0.55} fontSize="13" fontWeight="700">
                      {line}
                    </SvgText>
                  ))}
                </React.Fragment>
              ) : null}
            </React.Fragment>
          );
        })}
        {nodes.map((node, nodeIndex) => {
          const position = positions.get(node.id);
          if (!position) return null;
          const x = position.x - boxWidth / 2;
          const y = position.y - boxHeight / 2;
          const active = !hasHighlights || highlightSet.has(node.id);
          const fill = diagramPalette[nodeIndex % diagramPalette.length];
          const textLines = wrapSvgText(node.label, 15);
          return (
            <React.Fragment key={node.id}>
              <Rect x={x} y={y} width={boxWidth} height={boxHeight} rx={node.shape === 'decision' ? 8 : 18} fill={active ? fill : '#F1F5F9'} stroke={active ? '#2563EB' : '#CBD5E1'} strokeWidth={active ? 2.4 : 1.2} opacity={active ? 1 : 0.38} />
              {textLines.map((line, lineIndex) => (
                <SvgText
                  key={`${node.id}-${lineIndex}`}
                  x={position.x}
                  y={position.y - (textLines.length - 1) * 9 + lineIndex * 18 + 5}
                  textAnchor="middle"
                  fill={active ? '#0F172A' : '#64748B'}
                  opacity={active ? 1 : 0.45}
                  fontSize="15"
                  fontWeight="800"
                >
                  {line}
                </SvgText>
              ))}
            </React.Fragment>
          );
        })}
      </Svg>
  );
};

const parseSequenceDiagram = (diagram: string) => {
  const participants: Array<{ id: string; label: string }> = [];
  const messages: Array<{ from: string; to: string; text: string; dashed: boolean }> = [];
  const notes: Array<{ lanes: string[]; text: string; after: number }> = [];

  const ensureParticipant = (id: string, label = id) => {
    if (!participants.some((participant) => participant.id === id)) participants.push({ id, label });
  };

  diagram
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      const participant = line.match(/^participant\s+(.+)$/i);
      if (participant) {
        const aliasMatch = participant[1].trim().match(/^([^\s]+)\s+as\s+(.+)$/i);
        if (aliasMatch) {
          ensureParticipant(aliasMatch[1].trim(), aliasMatch[2].trim());
        } else {
          ensureParticipant(participant[1].trim());
        }
        return;
      }
      const note = line.match(/^Note\s+over\s+(.+?):\s*(.+)$/i);
      if (note) {
        const lanes = note[1].split(',').map((item) => item.trim());
        lanes.forEach((lane) => ensureParticipant(lane));
        notes.push({ lanes, text: normalizeDiagramText(note[2]), after: messages.length });
        return;
      }
      const message = line.match(/^(.+?)(-->>|--x|->>|-x)(.+?):\s*(.+)$/);
      if (message) {
        const from = message[1].trim();
        const to = message[3].trim();
        ensureParticipant(from);
        ensureParticipant(to);
        messages.push({ from, to, text: message[4].trim(), dashed: message[2].startsWith('--') });
      }
    });

  return { participants, messages, notes };
};

const SequenceDiagram = ({ diagram, expanded = false, highlightNodeIds }: { diagram: string; expanded?: boolean; highlightNodeIds?: string[] }) => {
  const { participants, messages, notes } = useMemo(() => parseSequenceDiagram(diagram), [diagram]);
  const highlightSet = useMemo(() => new Set(highlightNodeIds ?? []), [highlightNodeIds]);
  const hasHighlights = highlightSet.size > 0;
  const width = Math.max(760, participants.length * 246);
  const eventCount = messages.length + notes.length;
  const eventGap = 74;
  const height = Math.max(220, 104 + eventCount * eventGap);
  const laneGap = width / (participants.length + 1);
  const positions = new Map(participants.map((participant, index) => [participant.id, laneGap * (index + 1)]));

  if (!participants.length) {
    return <Text style={styles.diagramFallbackText}>{diagram}</Text>;
  }

  const orderedEvents = [
    ...messages.map((message, index) => ({ type: 'message' as const, index, order: index + notes.filter((note) => note.after <= index).length, message })),
    ...notes.map((note, index) => ({ type: 'note' as const, index, order: note.after + notes.slice(0, index + 1).filter((item) => item.after <= note.after).length - 0.5, note })),
  ].sort((a, b) => a.order - b.order);

  const renderedHeight = expanded ? height : Math.min(420, height);

  return (
      <Svg width={width} height={renderedHeight} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          <Marker id="seqArrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
            <Polygon points="0,0 8,4 0,8" fill="#94A3B8" />
          </Marker>
        </Defs>
        {participants.map((participant) => {
          const x = positions.get(participant.id) ?? 0;
          const active = !hasHighlights || highlightSet.has(participant.id);
          const labelLines = wrapSvgText(participant.label, 14).slice(0, 2);
          return (
            <React.Fragment key={participant.id}>
              <Rect x={x - 84} y={18} width={168} height={52} rx={16} fill={active ? '#DBEAFE' : '#F1F5F9'} stroke={active ? '#2563EB' : '#CBD5E1'} strokeWidth={active ? 2 : 1} opacity={active ? 1 : 0.45} />
              {labelLines.map((line, lineIndex) => (
                <SvgText key={`${participant.id}-${lineIndex}`} x={x} y={42 - (labelLines.length - 1) * 8 + lineIndex * 17} textAnchor="middle" fill={active ? '#1E3A8A' : '#64748B'} opacity={active ? 1 : 0.55} fontSize="14" fontWeight="900">
                  {line}
                </SvgText>
              ))}
              <Line x1={x} y1={70} x2={x} y2={height - 18} stroke={active ? '#93C5FD' : '#CBD5E1'} strokeWidth={2} strokeDasharray="6 8" opacity={active ? 1 : 0.35} />
            </React.Fragment>
          );
        })}
        {orderedEvents.map((event, index) => {
          const y = 116 + index * eventGap;
          if (event.type === 'note') {
            const laneXs = event.note.lanes.map((lane) => positions.get(lane)).filter((value): value is number => typeof value === 'number');
            if (!laneXs.length) return null;
            const left = Math.min(...laneXs) - 84;
            const right = Math.max(...laneXs) + 84;
            const lines = wrapSvgText(event.note.text, 24).slice(0, 3);
            return (
              <React.Fragment key={`note-${event.index}`}>
                <Rect x={left} y={y - 30} width={right - left} height={lines.length * 17 + 14} rx={12} fill="#FEF3C7" stroke="#FDE68A" />
                {lines.map((line, lineIndex) => (
                  <SvgText key={`note-${event.index}-${lineIndex}`} x={(left + right) / 2} y={y - 10 + lineIndex * 17} textAnchor="middle" fill="#92400E" fontSize="13" fontWeight="800">
                    {line}
                  </SvgText>
                ))}
              </React.Fragment>
            );
          }

          const fromX = positions.get(event.message.from) ?? 0;
          const toX = positions.get(event.message.to) ?? 0;
          const active = !hasHighlights || (highlightSet.has(event.message.from) && highlightSet.has(event.message.to));
          const messageLines = wrapSvgText(event.message.text, 20).slice(0, 2);
          return (
            <React.Fragment key={`${event.message.from}-${event.message.to}-${event.index}`}>
              <Line x1={fromX} y1={y} x2={toX} y2={y} stroke={active ? '#2563EB' : '#CBD5E1'} strokeWidth={active ? 2.8 : 1.5} opacity={active ? 1 : 0.35} strokeDasharray={event.message.dashed ? '7 7' : undefined} markerEnd="url(#seqArrow)" />
              <Rect x={(fromX + toX) / 2 - 84} y={y - 38} width={168} height={messageLines.length * 17 + 10} rx={10} fill="#F8FAFC" opacity={active ? 0.9 : 0.7} />
              {messageLines.map((line, lineIndex) => (
                <SvgText key={`${event.message.from}-${event.message.to}-label-${lineIndex}`} x={(fromX + toX) / 2} y={y - 20 + lineIndex * 17} textAnchor="middle" fill={active ? '#1D4ED8' : '#94A3B8'} opacity={active ? 1 : 0.55} fontSize="13" fontWeight="800">
                  {line}
                </SvgText>
              ))}
            </React.Fragment>
          );
        })}
      </Svg>
  );
};

const getDiagramMetrics = (diagram: string) => {
  if (/^\s*sequenceDiagram/i.test(diagram)) {
    const { participants, messages, notes } = parseSequenceDiagram(diagram);
    const width = Math.max(760, participants.length * 246);
    const height = Math.max(220, 104 + (messages.length + notes.length) * 74);
    return { width, height, isSequence: true };
  }

  const { nodes, edges } = parseGraphDiagram(diagram);
  const { width, height } = getGraphLayout(nodes, edges);
  return { width, height, isSequence: false };
};

function DiagramContent({ diagram, expanded = false, highlightNodeIds }: { diagram: string; expanded?: boolean; highlightNodeIds?: string[] }) {
  const isSequence = /^\s*sequenceDiagram/i.test(diagram);
  return isSequence ? <SequenceDiagram diagram={diagram} expanded={expanded} highlightNodeIds={highlightNodeIds} /> : <GraphDiagram diagram={diagram} expanded={expanded} highlightNodeIds={highlightNodeIds} />;
}

export function MermaidDiagram({ diagram, highlightNodeIds, animationSteps }: { diagram: string; highlightNodeIds?: string[]; animationSteps?: string[][] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [modalStepIndex, setModalStepIndex] = useState(0);
  const [inlineContentWidth, setInlineContentWidth] = useState(0);
  const [inlineViewportWidth, setInlineViewportWidth] = useState(0);
  const inlineScrollRef = useRef<ScrollView>(null);
  const window = useWindowDimensions();
  const metrics = useMemo(() => getDiagramMetrics(diagram), [diagram]);
  const steps = useMemo(
    () => (Array.isArray(animationSteps) ? animationSteps.filter((step) => Array.isArray(step) && step.length > 0) : []),
    [animationSteps],
  );
  const isWide = metrics.width / metrics.height > 1.08;
  const modalHighlightNodeIds = isOpen && steps.length > 1 ? steps[Math.min(modalStepIndex, steps.length - 1)] : highlightNodeIds;
  const closeDiagram = useCallback(async () => {
    setIsOpen(false);
    await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
  }, []);
  const openDiagram = useCallback(async () => {
    setModalStepIndex(0);
    if (isWide) {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    } else {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    }
    setIsOpen(true);
  }, [isWide]);

  useEffect(() => {
    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => undefined);
    };
  }, []);

  useEffect(() => {
    if (!inlineContentWidth || !inlineViewportWidth || inlineContentWidth <= inlineViewportWidth) return;
    const x = Math.max(0, (inlineContentWidth - inlineViewportWidth) / 2);
    requestAnimationFrame(() => {
      inlineScrollRef.current?.scrollTo({ x, animated: false });
    });
  }, [diagram, inlineContentWidth, inlineViewportWidth]);

  useEffect(() => {
    if (!isOpen || steps.length <= 1) return undefined;

    let interval: ReturnType<typeof setInterval> | undefined;
    const delay = setTimeout(() => {
      interval = setInterval(() => {
        setModalStepIndex((current) => {
          const next = current + 1;
          if (next >= steps.length) {
            if (interval) clearInterval(interval);
            return current;
          }
          return next;
        });
      }, 900);
    }, 3000);

    return () => {
      clearTimeout(delay);
      if (interval) clearInterval(interval);
    };
  }, [isOpen, steps.length]);

  return (
    <>
      <View style={styles.diagramFrame}>
        <ScrollView
          ref={inlineScrollRef}
          horizontal
          showsHorizontalScrollIndicator
          contentContainerStyle={styles.diagramInlineScroll}
          onContentSizeChange={(width) => setInlineContentWidth(width)}
          onLayout={(event) => setInlineViewportWidth(event.nativeEvent.layout.width)}
        >
          <DiagramContent diagram={diagram} highlightNodeIds={highlightNodeIds} />
        </ScrollView>
        <Pressable accessibilityRole="button" accessibilityLabel="\uB2E4\uC774\uC5B4\uADF8\uB7A8 \uD655\uB300" onPress={openDiagram} style={styles.diagramExpandBadge}>
          <Maximize2 size={14} color={colors.primary} />
          <Text style={styles.diagramExpandText}>{'\uD655\uB300'}</Text>
        </Pressable>
      </View>
      <Modal visible={isOpen} animationType="fade" transparent onRequestClose={closeDiagram}>
        <View style={styles.diagramModal}>
          <Pressable accessibilityRole="button" accessibilityLabel="\uB2EB\uAE30" onPress={closeDiagram} style={styles.diagramCloseButton}>
            <X size={24} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.diagramModalTitle}>{isWide ? '\uAC00\uB85C \uBCF4\uAE30' : '\uC138\uB85C \uBCF4\uAE30'}</Text>
          <View
            style={[
              styles.diagramModalSurface,
              {
                width: window.width - 40,
                maxHeight: window.height - 140,
              },
            ]}
          >
            <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={styles.diagramModalHorizontalScroll}>
              <ScrollView contentContainerStyle={styles.diagramModalScroll} showsVerticalScrollIndicator>
                <DiagramContent diagram={diagram} expanded highlightNodeIds={modalHighlightNodeIds} />
              </ScrollView>
            </ScrollView>
          </View>
          {steps.length > 1 ? (
            <Text style={styles.diagramModalStepText}>
              {modalStepIndex + 1} / {steps.length}
            </Text>
          ) : null}
        </View>
      </Modal>
    </>
  );
}

export function AnswerScreen({ navigation, route }: Props) {
  const level = getLevel(route.params.levelId);
  const question = getQuestion(route.params.levelId, route.params.questionId);
  const index = Math.max(0, level.questions.findIndex((item) => item.id === question.id));
  const study = useStudy();
  const currentStatus = study.statuses[question.id];
  const isReturningToList = useRef(false);
  const glossaryEntries = Object.entries(question.glossary);

  const goBackToList = useCallback(() => {
    if (isReturningToList.current) return;
    isReturningToList.current = true;
    navigation.navigate('MainTabs', { screen: 'Problem', params: { screen: 'LevelDetail', params: { levelId: level.id } } });
  }, [navigation, level.id]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <Pressable accessibilityRole="button" accessibilityLabel="문제 목록으로 돌아가기" onPress={goBackToList} style={styles.headerBack}>
          <ChevronLeft size={28} color={colors.text} />
        </Pressable>
      ),
    });
  }, [navigation, goBackToList]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (event) => {
      if (event.data.action.type !== 'GO_BACK' && event.data.action.type !== 'POP') return;
      if (isReturningToList.current) return;
      event.preventDefault();
      goBackToList();
    });
    return unsubscribe;
  }, [navigation, goBackToList]);

  const goNext = () => {
    const next = getNextQuestion(level.id, question.id);
    navigation.replace('Question', { levelId: level.id, questionId: next.id });
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.topTitle}>
        {level.label} · {index + 1} / {getLevelQuestionCount(level)}
      </Text>

      <View style={styles.questionSummary}>
        <View style={styles.questionHeaderRow}>
          <Text style={styles.questionLabel}>문제 요약</Text>
          <ChevronRight size={22} color={colors.faint} />
        </View>
        <Text style={styles.questionText} numberOfLines={2}>
          {question.question}
        </Text>
        <Text style={styles.questionMeta} numberOfLines={1}>
          {question.domain} · {question.topic} · {question.questionType}
        </Text>
      </View>

      <View style={styles.summaryCard}>
        <View style={styles.sectionBadge}>
          <Text style={styles.sectionBadgeText}>핵심 요약</Text>
        </View>
        <Text style={styles.answerText}>{question.shortAnswer}</Text>
      </View>

      {question.simpleExplanation.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>쉬운 설명</Text>
          {question.simpleExplanation.map((item, itemIndex) => (
            <View key={`${question.id}-simple-${itemIndex}`} style={styles.bulletRow}>
              <View style={styles.bullet} />
              <Text style={styles.bulletText}>{item}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {question.diagram ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>다이어그램</Text>
          <MermaidDiagram diagram={question.diagram} />
        </View>
      ) : null}

      {glossaryEntries.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>용어 정리</Text>
          {glossaryEntries.slice(0, 8).map(([term, description]) => (
            <View key={`${question.id}-glossary-${term}`} style={styles.glossaryRow}>
              <Text style={styles.glossaryTerm}>{term}</Text>
              <Text style={styles.glossaryDescription}>{description}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>상세 설명</Text>
        <Text style={styles.detailText}>{question.explanation}</Text>
        {question.references.length > 0 ? (
          <>
            <View style={styles.divider} />
            <Text style={styles.referenceLabel}>참고 자료</Text>
            {question.references.slice(0, 4).map((reference) => (
              <Pressable
                key={`${question.id}-${reference.title}`}
                accessibilityRole={reference.url ? 'link' : undefined}
                disabled={!reference.url}
                onPress={() => {
                  if (reference.url) Linking.openURL(reference.url);
                }}
                style={styles.referenceRow}
              >
                <Text style={[styles.reference, !reference.url && styles.referenceDisabled]} numberOfLines={1}>
                  {reference.title}
                </Text>
                {reference.url ? <ExternalLink size={14} color={colors.primary} /> : null}
              </Pressable>
            ))}
          </>
        ) : null}
      </View>

      <Text style={styles.assessLabel}>얼마나 이해했나요?</Text>
      <View style={styles.assessRow}>
        <Pressable
          style={[styles.secondaryButton, currentStatus === 'review' && styles.reviewSelectedButton]}
          onPress={() => study.setQuestionStatus(question.id, 'review')}
        >
          <Text style={[styles.secondaryText, currentStatus === 'review' && styles.reviewSelectedText]}>다시 볼래요</Text>
        </Pressable>
        <Pressable
          style={[styles.understoodButton, currentStatus === 'understood' && styles.understoodSelectedButton]}
          onPress={() => study.setQuestionStatus(question.id, 'understood')}
        >
          <Text style={[styles.understoodText, currentStatus === 'understood' && styles.understoodSelectedText]}>이해했어요</Text>
        </Pressable>
      </View>
      {currentStatus ? (
        <Text style={styles.savedHint}>{currentStatus === 'review' ? '복습할 문제로 저장됐어요.' : '이해한 문제로 저장됐어요.'}</Text>
      ) : null}
      <Pressable
        style={styles.cta}
        onPress={() => {
          study.setQuestionStatus(question.id, study.statuses[question.id] ?? 'review');
          goNext();
        }}
      >
        <Text style={styles.ctaText}>다음 문제</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: 24,
    paddingBottom: 48,
  },
  topTitle: {
    marginBottom: 18,
    textAlign: 'center',
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  questionSummary: {
    padding: 18,
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
  },
  questionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  questionLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '900',
  },
  questionText: {
    marginTop: 8,
    color: colors.text,
    fontSize: 15,
    lineHeight: 23,
    fontWeight: '900',
  },
  questionMeta: {
    marginTop: 10,
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  summaryCard: {
    marginTop: 18,
    padding: 22,
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.line,
  },
  sectionBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: colors.primarySoft,
    borderRadius: radii.pill,
  },
  sectionBadgeText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900',
  },
  answerText: {
    marginTop: 16,
    color: colors.text,
    fontSize: 15,
    lineHeight: 25,
    fontWeight: '800',
  },
  card: {
    marginTop: 18,
    padding: 20,
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.line,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  bulletRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  bullet: {
    width: 8,
    height: 8,
    marginTop: 8,
    backgroundColor: colors.teal,
    borderRadius: 4,
  },
  bulletText: {
    flex: 1,
    color: '#334155',
    fontSize: 14,
    lineHeight: 23,
    fontWeight: '700',
  },
  diagramFrame: {
    minHeight: 196,
    marginTop: 16,
    overflow: 'hidden',
    backgroundColor: '#F8FAFC',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
  },
  diagramInlineScroll: {
    minHeight: 196,
    alignItems: 'center',
    padding: 14,
    paddingRight: 72,
  },
  diagramExpandBadge: {
    position: 'absolute',
    right: 10,
    top: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.line,
  },
  diagramExpandText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '900',
  },
  diagramModal: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.94)',
  },
  diagramCloseButton: {
    position: 'absolute',
    top: 48,
    right: 22,
    zIndex: 2,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    borderRadius: radii.pill,
  },
  diagramModalTitle: {
    position: 'absolute',
    top: 58,
    left: 24,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  diagramModalStepText: {
    position: 'absolute',
    right: 24,
    bottom: 32,
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  diagramModalSurface: {
    overflow: 'hidden',
    backgroundColor: '#F8FAFC',
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
  },
  diagramModalHorizontalScroll: {
    flexGrow: 1,
    alignItems: 'center',
  },
  diagramModalScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 12,
  },
  diagramFallbackText: {
    padding: 14,
    color: '#334155',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
  },
  glossaryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 14,
  },
  glossaryTerm: {
    minWidth: 72,
    maxWidth: 112,
    paddingHorizontal: 12,
    paddingVertical: 6,
    overflow: 'hidden',
    color: colors.text,
    backgroundColor: '#F1F5F9',
    borderRadius: radii.pill,
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
  },
  glossaryDescription: {
    flex: 1,
    color: colors.muted,
    fontSize: 13,
    lineHeight: 21,
    fontWeight: '700',
  },
  detailText: {
    marginTop: 16,
    color: '#334155',
    fontSize: 13,
    lineHeight: 23,
  },
  divider: {
    height: 1,
    marginVertical: 18,
    backgroundColor: colors.line,
  },
  referenceLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '900',
  },
  referenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  reference: {
    flex: 1,
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
    textDecorationLine: 'underline',
  },
  referenceDisabled: {
    color: colors.muted,
    textDecorationLine: 'none',
  },
  assessLabel: {
    marginTop: 22,
    color: colors.muted,
    fontSize: 12,
  },
  assessRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  secondaryButton: {
    flex: 1,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
  },
  secondaryText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '800',
  },
  reviewSelectedButton: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FDBA74',
  },
  reviewSelectedText: {
    color: colors.orange,
  },
  understoodButton: {
    flex: 1,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
  },
  understoodText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '900',
  },
  understoodSelectedButton: {
    backgroundColor: '#CCFBF1',
    borderColor: colors.teal,
  },
  understoodSelectedText: {
    color: '#0F766E',
  },
  savedHint: {
    marginTop: 10,
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  cta: {
    height: 54,
    marginTop: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  headerBack: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -8,
  },
});
