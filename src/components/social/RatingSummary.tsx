import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../constants/theme';
import { StarRating } from './StarRating';

interface Props {
  average: number;
  total: number;
  /** distribuição: índice 0 = 1★, índice 4 = 5★ */
  distribution: number[];
}

function DistributionBar({ stars, count, total }: { stars: number; count: number; total: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <View style={bar.row}>
      <Text style={bar.label}>{stars}★</Text>
      <View style={bar.track}>
        <View style={[bar.fill, { width: `${pct}%` }]} />
      </View>
      <Text style={bar.pct}>{pct}%</Text>
    </View>
  );
}

const bar = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  label: { width: 22, fontSize: 12, color: theme.colors.textSecondary, textAlign: 'right' },
  track: {
    flex: 1,
    height: 8,
    backgroundColor: theme.colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: { height: '100%', backgroundColor: '#FFA500', borderRadius: 4 },
  pct: { width: 32, fontSize: 12, color: theme.colors.textSecondary, textAlign: 'right' },
});

export const RatingSummary = ({ average, total, distribution }: Props) => {
  return (
    <View style={styles.container}>
      {/* Média grande */}
      <View style={styles.scoreBlock}>
        <Text style={styles.scoreText}>{average.toFixed(1)}</Text>
        <StarRating value={average} readonly size="md" />
        <Text style={styles.totalText}>
          {total} {total === 1 ? 'avaliação' : 'avaliações'}
        </Text>
      </View>

      {/* Barras de distribuição: 5★ → 1★ */}
      <View style={styles.barsBlock}>
        {[5, 4, 3, 2, 1].map((s) => (
          <DistributionBar
            key={s}
            stars={s}
            count={distribution[s - 1] ?? 0}
            total={total}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    alignItems: 'center',
  },
  scoreBlock: { alignItems: 'center', gap: 4, minWidth: 70 },
  scoreText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: theme.colors.text,
    lineHeight: 44,
  },
  totalText: { fontSize: 12, color: theme.colors.textSecondary, textAlign: 'center' },
  barsBlock: { flex: 1 },
});
