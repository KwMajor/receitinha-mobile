import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { MatchResult } from '../../services/suggestionService';

interface Props {
  match: MatchResult;
  onPress: () => void;
}

const getStyles = (colors: any) => StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  photo: {
    width: '100%',
    height: 140,
    backgroundColor: colors.surface,
  },
  photoPlaceholder: {
    width: '100%',
    height: 140,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    padding: theme.spacing.md,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: theme.spacing.sm,
  },
  trackRow: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: colors.border,
    marginBottom: theme.spacing.sm,
  },
  trackFill: {
    borderRadius: 4,
  },
  countText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  missingLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  missingValue: {
    color: colors.text,
  },
});

export const SuggestionCard: React.FC<Props> = ({ match, onPress }) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const { recipe, score, matchCount, totalCount, missingIngredients } = match;
  const fillColor = score >= 0.8 ? colors.success : score >= 0.6 ? colors.warning : colors.primary;
  const fillPct = `${Math.round(score * 100)}%`;

  const missingPreview = missingIngredients.slice(0, 3).join(', ') +
    (missingIngredients.length > 3 ? ` +${missingIngredients.length - 3}` : '');

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      {recipe.photoUrl ? (
        <Image source={{ uri: recipe.photoUrl }} style={styles.photo} resizeMode="cover" />
      ) : (
        <View style={styles.photoPlaceholder}>
          <Feather name="image" size={36} color={colors.border} />
        </View>
      )}

      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>{recipe.title}</Text>

        {/* Progress bar */}
        <View style={styles.trackRow}>
          <View style={[styles.trackFill, { width: fillPct as any, backgroundColor: fillColor }]} />
        </View>

        <Text style={styles.countText}>
          Você tem {matchCount} de {totalCount} ingrediente{totalCount !== 1 ? 's' : ''}
        </Text>

        {missingIngredients.length > 0 && (
          <Text style={styles.missingLabel} numberOfLines={2}>
            {'Faltam: '}
            <Text style={styles.missingValue}>{missingPreview}</Text>
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};
