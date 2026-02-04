import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import { AlertCircle, ChevronDown, ChevronUp, X, Wand2 } from 'lucide-react-native';
import type { Critique } from '@protocol/shared/schemas';
import { fetchApi } from '@/lib/api';

type Props = {
  critiques: Critique[];
  protocolId: string;
  verified?: boolean;
  onCritiquesUpdated?: (critiques: Critique[]) => void;
  onProtocolUpdated?: () => void;
};

export function CritiquesSection({
  critiques,
  protocolId,
  verified = true,
  onCritiquesUpdated,
  onProtocolUpdated,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [selectedCritiques, setSelectedCritiques] = useState<Set<number>>(new Set());
  const [dismissing, setDismissing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [displayCritiques, setDisplayCritiques] = useState<Critique[]>(critiques);

  const activeCritiques = displayCritiques;
  if (activeCritiques.length === 0) return null;

  const toggleCritique = (index: number) => {
    setSelectedCritiques((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const handleDismiss = async () => {
    if (selectedCritiques.size === 0) return;
    setDismissing(true);
    try {
      const data = await fetchApi<{ critiques: Critique[] }>('/api/protocol/critiques', {
        method: 'POST',
        body: JSON.stringify({
          protocolId,
          critiqueIndices: Array.from(selectedCritiques),
          action: 'dismiss',
        }),
      });
      setDisplayCritiques(data.critiques);
      setSelectedCritiques(new Set());
      onCritiquesUpdated?.(data.critiques);
    } catch {
      // silent fail
    } finally {
      setDismissing(false);
    }
  };

  const handleApply = async () => {
    if (selectedCritiques.size === 0) return;
    setApplying(true);
    try {
      const data = await fetchApi<{ critiques: Critique[] }>('/api/protocol/critiques', {
        method: 'POST',
        body: JSON.stringify({
          protocolId,
          critiqueIndices: Array.from(selectedCritiques),
          action: 'apply',
        }),
      });
      setDisplayCritiques(data.critiques);
      setSelectedCritiques(new Set());
      onCritiquesUpdated?.(data.critiques);
      onProtocolUpdated?.();
    } catch {
      // silent fail
    } finally {
      setApplying(false);
    }
  };

  const majorCount = activeCritiques.filter((c) => c.severity === 'major').length;
  const moderateCount = activeCritiques.filter((c) => c.severity === 'moderate').length;

  const getSeverityBorderColor = (severity: string) => {
    switch (severity) {
      case 'major':
        return '#c62828';
      case 'moderate':
        return '#f9a825';
      default:
        return '#e5e5e5';
    }
  };

  const getSeverityBadgeStyle = (severity: string) => {
    switch (severity) {
      case 'major':
        return styles.severityBadgeMajor;
      case 'moderate':
        return styles.severityBadgeModerate;
      default:
        return styles.severityBadgeMinor;
    }
  };

  const getSeverityTextStyle = (severity: string) => {
    switch (severity) {
      case 'major':
        return styles.severityTextMajor;
      case 'moderate':
        return styles.severityTextModerate;
      default:
        return styles.severityTextMinor;
    }
  };

  return (
    <View style={[styles.container, !verified && styles.containerUnverified]}>
      <Pressable style={styles.header} onPress={() => setExpanded(!expanded)}>
        <View style={styles.headerLeft}>
          <AlertCircle size={16} color="#f9a825" />
          <Text style={styles.headerTitle}>
            {activeCritiques.length} area{activeCritiques.length !== 1 ? 's' : ''} for improvement
          </Text>
          {majorCount > 0 && (
            <View style={[styles.countBadge, styles.countBadgeMajor]}>
              <Text style={styles.countBadgeMajorText}>{majorCount} major</Text>
            </View>
          )}
          {moderateCount > 0 && (
            <View style={[styles.countBadge, styles.countBadgeModerate]}>
              <Text style={styles.countBadgeModerateText}>{moderateCount} moderate</Text>
            </View>
          )}
        </View>
        {expanded ? (
          <ChevronUp size={16} color="#666" />
        ) : (
          <ChevronDown size={16} color="#666" />
        )}
      </Pressable>

      {expanded && (
        <View style={styles.content}>
          {activeCritiques.map((critique, i) => (
            <Pressable
              key={i}
              style={[
                styles.critiqueItem,
                { borderLeftColor: getSeverityBorderColor(critique.severity) },
                selectedCritiques.has(i) && styles.critiqueItemSelected,
              ]}
              onPress={() => toggleCritique(i)}
            >
              <View style={styles.critiqueCheckbox}>
                <View
                  style={[
                    styles.checkbox,
                    selectedCritiques.has(i) && styles.checkboxSelected,
                  ]}
                >
                  {selectedCritiques.has(i) && (
                    <View style={styles.checkboxInner} />
                  )}
                </View>
              </View>
              <View style={styles.critiqueContent}>
                <View style={styles.critiqueHeader}>
                  <View style={[styles.severityBadge, getSeverityBadgeStyle(critique.severity)]}>
                    <Text style={[styles.severityText, getSeverityTextStyle(critique.severity)]}>
                      {critique.severity}
                    </Text>
                  </View>
                  <Text style={styles.critiqueCategory}>{critique.category}</Text>
                </View>
                <Text style={styles.critiqueCriticism}>{critique.criticism}</Text>
                <Text style={styles.critiqueSuggestion}>
                  Suggestion: {critique.suggestion}
                </Text>
              </View>
            </Pressable>
          ))}

          {selectedCritiques.size > 0 && (
            <View style={styles.actions}>
              <Pressable
                style={[styles.actionButton, styles.dismissButton]}
                onPress={handleDismiss}
                disabled={dismissing || applying}
              >
                {dismissing ? (
                  <ActivityIndicator size="small" color="#666" />
                ) : (
                  <>
                    <X size={16} color="#666" />
                    <Text style={styles.dismissButtonText}>Dismiss</Text>
                  </>
                )}
              </Pressable>
              <Pressable
                style={[styles.actionButton, styles.applyButton]}
                onPress={handleApply}
                disabled={dismissing || applying}
              >
                {applying ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Wand2 size={16} color="#fff" />
                    <Text style={styles.applyButtonText}>Apply recommendations</Text>
                  </>
                )}
              </Pressable>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    overflow: 'hidden',
  },
  containerUnverified: {
    opacity: 0.6,
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
    color: '#1a2e1a',
  },
  countBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  countBadgeMajor: {
    backgroundColor: 'rgba(198, 40, 40, 0.15)',
  },
  countBadgeMajorText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#c62828',
    fontVariant: ['tabular-nums'],
  },
  countBadgeModerate: {
    backgroundColor: 'rgba(249, 168, 37, 0.15)',
  },
  countBadgeModerateText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#f9a825',
    fontVariant: ['tabular-nums'],
  },
  content: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 8,
  },
  critiqueItem: {
    flexDirection: 'row',
    borderLeftWidth: 3,
    paddingLeft: 12,
    paddingVertical: 8,
  },
  critiqueItemSelected: {
    backgroundColor: 'rgba(45, 90, 45, 0.05)',
    borderRadius: 6,
  },
  critiqueCheckbox: {
    paddingTop: 2,
    paddingRight: 10,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    borderColor: '#2d5a2d',
    backgroundColor: '#2d5a2d',
  },
  checkboxInner: {
    width: 8,
    height: 8,
    borderRadius: 2,
    backgroundColor: '#fff',
  },
  critiqueContent: {
    flex: 1,
  },
  critiqueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  severityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  severityBadgeMajor: {
    backgroundColor: 'rgba(198, 40, 40, 0.15)',
  },
  severityBadgeModerate: {
    backgroundColor: 'rgba(249, 168, 37, 0.15)',
  },
  severityBadgeMinor: {
    backgroundColor: '#f5f5f0',
  },
  severityText: {
    fontSize: 11,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  severityTextMajor: {
    color: '#c62828',
  },
  severityTextModerate: {
    color: '#f9a825',
  },
  severityTextMinor: {
    color: '#666',
  },
  critiqueCategory: {
    fontSize: 12,
    color: '#666',
  },
  critiqueCriticism: {
    fontSize: 13,
    color: '#1a2e1a',
    lineHeight: 18,
    marginBottom: 4,
  },
  critiqueSuggestion: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    lineHeight: 17,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 4,
  },
  dismissButton: {
    borderWidth: 1,
    borderColor: '#ddd',
  },
  dismissButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#666',
  },
  applyButton: {
    backgroundColor: '#2d5a2d',
  },
  applyButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#fff',
  },
});
