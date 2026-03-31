import React from 'react';
import { TouchableOpacity, View, Text, Image, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { formatTime } from '../../utils/formatters';
import { Recipe } from '../../types';
import { FavoriteButton } from '../common/FavoriteButton';
import { useRecipeStats } from '../../hooks/useRecipeStats';

interface RecipeCardProps {
  recipe: Recipe;
  onPress: () => void;
}

export const RecipeCard = ({ recipe, onPress }: RecipeCardProps) => {
  const { timesCooked } = useRecipeStats(recipe.id);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.imageContainer}>
        {recipe.photoUrl ? (
          <Image source={{ uri: recipe.photoUrl }} style={styles.image} />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]}>
            <Feather name="image" size={32} color={theme.colors.textSecondary} />
          </View>
        )}
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{recipe.category || 'Sem categoria'}</Text>
        </View>
        {recipe.is_public === 1 && (
          <View style={styles.publicBadge}>
            <Feather name="globe" size={10} color="#fff" />
            <Text style={styles.publicBadgeText}>Publicada</Text>
          </View>
        )}
        {timesCooked > 0 && (
          <View style={styles.cookedBadge}>
            <Feather name="check-circle" size={10} color="#fff" />
            <Text style={styles.cookedBadgeText}>Já preparei</Text>
          </View>
        )}
      </View>
      
      <View style={styles.infoContainer}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: theme.spacing.sm }}>
          <Text style={styles.title} numberOfLines={2}>{recipe.title}</Text>
          <FavoriteButton recipeId={recipe.id} />
        </View>
        
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Feather name="clock" size={14} color={theme.colors.textSecondary} />
            <Text style={styles.metaText}>{formatTime(recipe.prepTime)}</Text>
          </View>
          <View style={styles.metaItem}>
            <Feather name="users" size={14} color={theme.colors.textSecondary} />
            <Text style={styles.metaText}>{recipe.servings} {recipe.servings === 1 ? 'porção' : 'porções'}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};


const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  imageContainer: {
    height: 150,
    width: '100%',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryBadge: {
    position: 'absolute',
    top: theme.spacing.sm,
    right: theme.spacing.sm,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.round,
  },
  categoryText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  publicBadge: {
    position: 'absolute',
    top: theme.spacing.sm,
    left: theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: theme.colors.success,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.round,
  },
  publicBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  cookedBadge: {
    position: 'absolute',
    bottom: theme.spacing.sm,
    left: theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: theme.colors.success,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.round,
  },
  cookedBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  infoContainer: {
    padding: theme.spacing.md,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  }
});