import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme';

type Props = {
  value?: string;
};

const renderInline = (text: string) => {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <Text key={`${part}-${index}`} style={styles.bold}>
          {part.slice(2, -2)}
        </Text>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <Text key={`${part}-${index}`} style={styles.code}>
          {part.slice(1, -1)}
        </Text>
      );
    }
    return <Text key={`${part}-${index}`}>{part}</Text>;
  });
};

export function RichText({ value }: Props) {
  if (!value) return null;
  const blocks = value
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  return (
    <View style={styles.container}>
      {blocks.map((block, index) => (
        <Text key={`${block.slice(0, 24)}-${index}`} style={styles.paragraph}>
          {renderInline(block)}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  paragraph: {
    color: '#334155',
    fontSize: 14,
    lineHeight: 24,
    fontWeight: '600',
  },
  bold: {
    color: colors.text,
    fontWeight: '900',
  },
  code: {
    color: colors.primary,
    fontWeight: '900',
  },
});
