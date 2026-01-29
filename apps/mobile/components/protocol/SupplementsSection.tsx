import { View, Text, StyleSheet } from 'react-native';
import type { SupplementationPlan } from '@protocol/shared/schemas';

type Props = {
  supplementation: SupplementationPlan;
};

export function SupplementsSection({ supplementation }: Props) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Supplements</Text>

      <View style={styles.card}>
        {supplementation.supplements.map((supplement, index) => (
          <View
            key={index}
            style={[
              styles.supplementItem,
              index < supplementation.supplements.length - 1 && styles.supplementItemBorder,
            ]}
          >
            <View style={styles.supplementHeader}>
              <Text style={styles.supplementName}>{supplement.name}</Text>
              <Text style={styles.supplementDosage}>{supplement.dosage}</Text>
            </View>
            <Text style={styles.supplementTiming}>{supplement.timing}</Text>
            <Text style={styles.supplementPurpose}>{supplement.purpose}</Text>
            {supplement.notes && (
              <Text style={styles.supplementNotes}>Note: {supplement.notes}</Text>
            )}
          </View>
        ))}

        {supplementation.general_notes.length > 0 && (
          <View style={styles.notes}>
            <Text style={styles.notesTitle}>General Notes</Text>
            {supplementation.general_notes.map((note, index) => (
              <Text key={index} style={styles.noteItem}>
                • {note}
              </Text>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#2d5a2d',
  },
  supplementItem: {
    paddingBottom: 12,
    marginBottom: 12,
  },
  supplementItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  supplementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  supplementName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a2e1a',
  },
  supplementDosage: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2d5a2d',
    fontVariant: ['tabular-nums'],
  },
  supplementTiming: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  supplementPurpose: {
    fontSize: 13,
    color: '#444',
    fontStyle: 'italic',
  },
  supplementNotes: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  notes: {
    marginTop: 4,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  notesTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  noteItem: {
    fontSize: 13,
    color: '#666',
    lineHeight: 20,
  },
});
