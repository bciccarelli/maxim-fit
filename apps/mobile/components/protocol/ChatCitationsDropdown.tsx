import { View, Text, StyleSheet, Pressable, Linking } from 'react-native';
import { useState } from 'react';
import { ChevronDown, ChevronUp, ExternalLink } from 'lucide-react-native';
import type { Citation } from '@protocol/shared/schemas';
import { colors, spacing, borderRadius, fontSize } from '@/lib/theme';

type Props = {
  citations: Citation[];
};

export function ChatCitationsDropdown({ citations }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (!citations || citations.length === 0) return null;

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
        {expanded ? (
          <ChevronUp size={12} color={colors.onSurfaceVariant} />
        ) : (
          <ChevronDown size={12} color={colors.onSurfaceVariant} />
        )}
        <Text style={styles.headerText}>
          {citations.length} source{citations.length !== 1 ? 's' : ''}
        </Text>
      </Pressable>

      {expanded && (
        <View style={styles.content}>
          {citations.map((citation) => (
            <Pressable
              key={citation.id}
              style={styles.citationItem}
              onPress={() => handleOpenUrl(citation.url)}
            >
              <ExternalLink size={10} color={colors.onSurfaceVariant} style={styles.linkIcon} />
              <Text style={styles.citationDomain} numberOfLines={1}>
                {citation.title || citation.domain || 'Source'}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerText: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  content: {
    marginTop: 6,
    paddingLeft: 4,
    borderLeftWidth: 1,
    borderLeftColor: colors.outlineVariant,
    gap: 4,
  },
  citationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingLeft: 8,
    gap: 6,
  },
  linkIcon: {
    marginTop: 0,
  },
  citationDomain: {
    flex: 1,
    fontSize: 11,
    fontWeight: '500',
    color: colors.onSurface,
  },
});
