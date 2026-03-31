import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { formatTime } from '../../utils/formatters';
import { PublicRecipe } from '../../types';
import { savePublicRecipeLocally } from '../../services/api/communityService';

interface Props {
  recipe: PublicRecipe;
  onPress: () => void;
}

function StarRating({ average, count }: { average: number; count: number }) {
  const stars = [1, 2, 3, 4, 5];
  return (
    <View style={starStyles.row}>
      {stars.map((s) => (
        <Feather
          key={s}
          name="star"
          size={12}
          color={s <= Math.round(average) ? '#FFA500' : theme.colors.border}
        />
      ))}
      <Text style={starStyles.label}>
        {average.toFixed(1)} ({count})
      </Text>
    </View>
  );
}

const starStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  label: { fontSize: 12, color: theme.colors.textSecondary, marginLeft: 4 },
});

export const CommunityRecipeCard = ({ recipe, onPress }: Props) => {
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await savePublicRecipeLocally(recipe);
      Alert.alert('Salvo!', 'A receita foi adicionada às suas receitas.');
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar a receita. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
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
      </View>

      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>
          {recipe.title}
        </Text>

        <View style={styles.authorRow}>
          <Feather name="user" size={13} color={theme.colors.textSecondary} />
          <Text style={styles.authorText} numberOfLines={1}>
            {recipe.authorName}
          </Text>
        </View>

        <StarRating average={recipe.averageRating} count={recipe.ratingCount} />

        <View style={styles.footer}>
          <View style={styles.metaItem}>
            <Feather name="clock" size={13} color={theme.colors.textSecondary} />
            <Text style={styles.metaText}>{formatTime(recipe.prepTime)}</Text>
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            activeOpacity={0.8}
          >
            <Feather name="bookmark" size={14} color="#fff" />
            <Text style={styles.saveBtnText}>{saving ? 'Salvando…' : 'Salvar'}</Text>
          </TouchableOpacity>
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
  imageContainer: { height: 160, width: '100%', position: 'relative' },
  image: { width: '100%', height: '100%', resizeMode: 'cover' },
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
  categoryText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  body: { padding: theme.spacing.md, gap: theme.spacing.xs },
  title: {
    fontSize: 17,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 2,
  },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  authorText: { fontSize: 13, color: theme.colors.textSecondary, flex: 1 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: theme.spacing.xs,
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 13, color: theme.colors.textSecondary },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.round,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
});
