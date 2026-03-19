import { View, Text, StyleSheet } from 'react-native';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react-native';
import { colors, spacing, borderRadius, fontSize } from '@/lib/theme';

interface Scores {
  weighted_goal_score?: number | null;
}

interface ScoreComparisonProps {
  currentScores: Scores;
  proposedScores: Scores;
}

export function ScoreComparison({ currentScores, proposedScores }: ScoreComparisonProps) {
  const renderScoreChange = (current: number | null | undefined, proposed: number | null | undefined) => {
    if (current == null || proposed == null) return null;

    const diff = proposed - current;
    const isPositive = diff > 0;
    const isNeutral = Math.abs(diff) < 0.1;

    if (isNeutral) {
      return (
        <View style={styles.changeIndicator}>
          <Minus size={14} color={colors.onSurfaceVariant} />
          <Text style={styles.changeNeutral}>No change</Text>
        </View>
      );
    }

    return (
      <View style={styles.changeIndicator}>
        {isPositive ? (
          <TrendingUp size={14} color={colors.primaryContainer} />
        ) : (
          <TrendingDown size={14} color={colors.destructive} />
        )}
        <Text style={[styles.changeText, isPositive ? styles.changePositive : styles.changeNegative]}>
          {isPositive ? '+' : ''}{diff.toFixed(1)}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Score Comparison</Text>

      <View style={styles.row}>
        {/* Current Score */}
        <View style={styles.column}>
          <Text style={styles.columnLabel}>Current</Text>
          <View style={styles.scoreCard}>
            <View style={styles.scoreItem}>
              <Text style={styles.scoreValue}>
                {currentScores.weighted_goal_score?.toFixed(1) ?? '-'}
              </Text>
              <Text style={styles.scoreLabel}>Goal Score</Text>
            </View>
          </View>
        </View>

        {/* Proposed Score */}
        <View style={styles.column}>
          <Text style={styles.columnLabel}>Proposed</Text>
          <View style={[styles.scoreCard, styles.scoreCardProposed]}>
            <View style={styles.scoreItem}>
              <Text style={[styles.scoreValue, styles.scoreValueProposed]}>
                {proposedScores.weighted_goal_score?.toFixed(1) ?? '-'}
              </Text>
              <Text style={styles.scoreLabel}>Goal Score</Text>
              {renderScoreChange(
                currentScores.weighted_goal_score,
                proposedScores.weighted_goal_score
              )}
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  title: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  column: {
    flex: 1,
  },
  columnLabel: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    textAlign: 'center',
  },
  scoreCard: {
    backgroundColor: colors.surface,
    borderRadius: 0,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  scoreCardProposed: {
    backgroundColor: colors.selectedBg,
    borderWidth: 1,
    borderColor: colors.primaryContainer,
  },
  scoreItem: {
    alignItems: 'center',
  },
  scoreValue: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.onSurface,
    fontVariant: ['tabular-nums'],
  },
  scoreValueProposed: {
    color: colors.primaryContainer,
  },
  scoreLabel: {
    fontSize: 10,
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 4,
  },
  changeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 2,
  },
  changeText: {
    fontSize: 12,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  changePositive: {
    color: colors.primaryContainer,
  },
  changeNegative: {
    color: colors.destructive,
  },
  changeNeutral: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
});
