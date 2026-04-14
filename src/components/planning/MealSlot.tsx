import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { Recipe } from '../../types';

interface Props {
  label: string;
  recipe: Recipe | null;
  onPress: () => void;
  onLongPress: () => void;
  onRemove: () => void;
  isDropTarget: boolean;
  isDragging: boolean;
}

const getStyles = (colors: any) => StyleSheet.create({
  emptySlot: {
    height: 56,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.border,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 3,
    gap: 2,
  },
  emptyLabel: { fontSize: 10, color: colors.textSecondary },
  filledSlot: {
    height: 56,
    borderRadius: theme.borderRadius.md,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginVertical: 3,
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  thumbnail: { width: 32, height: 32, borderRadius: theme.borderRadius.sm, backgroundColor: colors.border },
  thumbnailPlaceholder: {
    width: 32, height: 32, borderRadius: theme.borderRadius.sm,
    backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center',
  },
  recipeTitle: { flex: 1, fontSize: 10, color: colors.text, fontWeight: '500' },
  removeBtn: { padding: 2 },
  dropTarget: {
    borderColor: colors.primary,
    borderWidth: 2,
    borderStyle: 'solid',
    backgroundColor: colors.primaryLight,
  },
  dragging: {
    opacity: 0.7,
    transform: [{ scale: 1.05 }],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
});

export const MealSlot: React.FC<Props> = ({ label, recipe, onPress, onLongPress, onRemove, isDropTarget, isDragging }) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);

  if (recipe) {
    return (
      <TouchableOpacity
        style={[styles.filledSlot, isDropTarget && styles.dropTarget, isDragging && styles.dragging]}
        onPress={onPress}
        onLongPress={onLongPress}
        activeOpacity={0.8}
      >
        {recipe.photoUrl ? (
          <Image source={{ uri: recipe.photoUrl }} style={styles.thumbnail} />
        ) : (
          <View style={styles.thumbnailPlaceholder}>
            <Feather name="image" size={14} color={colors.textSecondary} />
          </View>
        )}
        <Text style={styles.recipeTitle} numberOfLines={1}>{recipe.title}</Text>
        <TouchableOpacity style={styles.removeBtn} onPress={onRemove} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
          <Feather name="x" size={12} color={colors.textSecondary} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={[styles.emptySlot, isDropTarget && styles.dropTarget]} onPress={onPress} activeOpacity={0.7}>
      <Feather name="plus" size={14} color={colors.textSecondary} />
      <Text style={styles.emptyLabel}>{label}</Text>
    </TouchableOpacity>
  );
};
