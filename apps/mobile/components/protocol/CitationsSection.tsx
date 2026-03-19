import { View, Text, StyleSheet, Pressable, Linking } from 'react-native';
import { useState } from 'react';
import { BookOpen, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react-native';
import type { Citation } from '@protocol/shared/schemas';
import { colors, spacing, borderRadius, fontSize } from '@/lib/theme';

type Props = {
  citations: Citation[];
};

const OPERATION_LABELS: Record<string, string> = {
  verify: 'Verification',
  modify: 'Modification',
  ask: 'Q&A',
  generate_meals: 'Meal Planning',
};

export function CitationsSection({ citations }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (!citations || citations.length === 0) return null;

  // Group by operation type
  const byOperation = citations.reduce((acc, c) => {
    (acc[c.operation] = acc[c.operation] || []).push(c);
    return acc;
  }, {} as Record<string, Citation[]>);

  const handleOpenUrl = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch (error) {
      console.error('Failed to open URL:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Pressable style={styles.header} onPress={() => setExpanded(!expanded)}>
        <View style={styles.headerLeft}>
          <BookOpen size={16} color={colors.primaryContainer} />
          <Text style={styles.headerTitle}>
            {citations.length} source{citations.length !== 1 ? 's' : ''}
          </Text>
          <View style={styles.evidenceBadge}>
            <Text style={styles.evidenceBadgeText}>Evidence-backed</Text>
          </View>
        </View>
        {expanded ? (
          <ChevronUp size={16} color={colors.onSurfaceVariant} />
        ) : (
          <ChevronDown size={16} color={colors.onSurfaceVariant} />
        )}
      </Pressable>

      {expanded && (
        <View style={styles.content}>
          {Object.entries(byOperation).map(([op, opCitations]) => (
            <View key={op} style={styles.operationGroup}>
              <Text style={styles.operationLabel}>
                {OPERATION_LABELS[op] || op}
              </Text>
              <View style={styles.citationsList}>
                {opCitations.map((citation) => (
                  <Pressable
                    key={citation.id}
                    style={styles.citationItem}
                    onPress={() => handleOpenUrl(citation.url)}
                  >
                    <View style={styles.citationContent}>
                      <View style={styles.citationHeader}>
                        <Text style={styles.citationTitle} numberOfLines={2}>
                          {citation.title}
                        </Text>
                        <ExternalLink size={12} color={colors.onSurfaceVariant} />
                      </View>
                      <Text style={styles.citationDomain}>{citation.domain}</Text>
                      {citation.relevantText && (
                        <Text style={styles.citationRelevantText} numberOfLines={2}>
                          &ldquo;{citation.relevantText}&rdquo;
                        </Text>
                      )}
                    </View>
                  </Pressable>
                ))}
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    flexWrap: 'wrap',
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.onSurface,
  },
  evidenceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 0,
    backgroundColor: 'rgba(45, 90, 45, 0.1)',
  },
  evidenceBadgeText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.primaryContainer,
    fontVariant: ['tabular-nums'],
  },
  content: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 16,
  },
  operationGroup: {
    gap: 8,
  },
  operationLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: colors.onSurfaceVariant,
  },
  citationsList: {
    gap: 1,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceContainerLow,
  },
  citationItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceContainerLow,
  },
  citationContent: {
    gap: 4,
  },
  citationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  citationTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: colors.onSurface,
    lineHeight: 18,
  },
  citationDomain: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    fontVariant: ['tabular-nums'],
  },
  citationRelevantText: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    fontStyle: 'italic',
    lineHeight: 16,
    marginTop: 2,
  },
});
