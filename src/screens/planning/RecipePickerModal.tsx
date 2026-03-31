import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { useAuthStore } from '../../store/authStore';
import { getRecipes } from '../../services/sqlite/recipeService';
import { Recipe } from '../../types';
import { useDebounce } from '../../hooks/useDebounce';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (recipe: Recipe) => void;
}

export const RecipePickerModal: React.FC<Props> = ({ visible, onClose, onSelect }) => {
  const { user } = useAuthStore();
  const [query, setQuery] = useState('');
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selected, setSelected] = useState<Recipe | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const debouncedQuery = useDebounce(query, 300);

  const fetchRecipes = useCallback(async (q: string) => {
    if (!user) return;
    setIsLoading(true);
    try {
      const data = await getRecipes(user.id, { query: q });
      setRecipes(data);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (visible) {
      setQuery('');
      setSelected(null);
      fetchRecipes('');
    }
  }, [visible, fetchRecipes]);

  useEffect(() => {
    fetchRecipes(debouncedQuery);
  }, [debouncedQuery, fetchRecipes]);

  const handleConfirm = () => {
    if (selected) {
      onSelect(selected);
      onClose();
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Escolher Receita</Text>
          <TouchableOpacity onPress={onClose}>
            <Feather name="x" size={22} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.searchBar}>
          <Feather name="search" size={16} color={theme.colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar receita..."
            value={query}
            onChangeText={setQuery}
            autoFocus
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Feather name="x-circle" size={16} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {isLoading ? (
          <ActivityIndicator style={styles.loader} color={theme.colors.primary} />
        ) : (
          <FlatList
            data={recipes}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <Text style={styles.empty}>Nenhuma receita encontrada</Text>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.recipeItem, selected?.id === item.id && styles.recipeItemSelected]}
                onPress={() => setSelected(item)}
                activeOpacity={0.7}
              >
                {item.photoUrl ? (
                  <Image source={{ uri: item.photoUrl }} style={styles.recipeThumb} />
                ) : (
                  <View style={[styles.recipeThumb, styles.recipeThumbPlaceholder]}>
                    <Feather name="image" size={18} color={theme.colors.border} />
                  </View>
                )}
                <View style={styles.recipeInfo}>
                  <Text style={styles.recipeName} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.recipeMeta}>{item.category} · {item.prepTime} min</Text>
                </View>
                {selected?.id === item.id && (
                  <Feather name="check-circle" size={20} color={theme.colors.primary} />
                )}
              </TouchableOpacity>
            )}
          />
        )}

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.addBtn, !selected && styles.addBtnDisabled]}
            onPress={handleConfirm}
            disabled={!selected}
          >
            <Text style={styles.addBtnText}>Adicionar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    margin: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    fontSize: 15,
    color: theme.colors.text,
  },
  loader: {
    marginTop: theme.spacing.xl,
  },
  list: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  empty: {
    textAlign: 'center',
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xl,
  },
  recipeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    gap: theme.spacing.sm,
  },
  recipeItemSelected: {
    backgroundColor: theme.colors.primary + '10',
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.sm,
    borderBottomColor: 'transparent',
  },
  recipeThumb: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.border,
  },
  recipeThumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  recipeInfo: {
    flex: 1,
  },
  recipeName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  recipeMeta: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  footer: {
    padding: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  addBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
  addBtnDisabled: {
    backgroundColor: theme.colors.border,
  },
  addBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});
