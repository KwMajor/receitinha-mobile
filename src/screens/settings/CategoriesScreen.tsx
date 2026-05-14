import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { getCategories, createCustomCategory, deleteCustomCategory, toggleCategoryActive } from '../../services/sqlite/categoryService';
import { useAuthStore } from '../../store/authStore';
import { Category } from '../../types';

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: theme.spacing.md,
  },
  description: {
    fontSize: 16,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: colors.surface,
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  addBtnText: {
    marginLeft: theme.spacing.sm,
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
  },
  addCard: {
    backgroundColor: colors.surface,
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.sm,
    fontSize: 16,
    marginBottom: theme.spacing.sm,
    color: colors.text,
    backgroundColor: colors.background,
  },
  addActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: theme.spacing.sm,
  },
  cancelBtn: {
    padding: theme.spacing.sm,
  },
  cancelBtnText: {
    color: colors.textSecondary,
    fontWeight: '500',
  },
  saveBtn: {
    backgroundColor: colors.primary,
    padding: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  list: {
    padding: theme.spacing.md,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  categoryInactive: {
    opacity: 0.8,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryName: {
    marginLeft: theme.spacing.md,
    fontSize: 16,
    color: colors.text,
  },
  categoryNameInactive: {
    color: colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  deleteBtn: {
    padding: theme.spacing.xs,
  }
});

export const CategoriesScreen = () => {
  const { user } = useAuthStore();
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  useEffect(() => {
    loadCategories();
  }, [user]);

  const loadCategories = async () => {
    if (!user) return;
    try {
      const cats = await getCategories(user.id);
      setCategories(cats);
    } catch (error) {
       Alert.alert('Erro ao carregar', 'Não foi possível carregar suas categorias. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!user || !newCatName.trim()) return;
    try {
      await createCustomCategory(user.id, newCatName.trim());
      setNewCatName('');
      setIsAdding(false);
      loadCategories();
    } catch (error) {
      Alert.alert('Erro ao criar', 'Não foi possível criar a categoria. Tente novamente.');
    }
  };

  const handleToggleActive = async (categoryId: string, currentStatus: boolean) => {
    if (!user) return;
    try {
      await toggleCategoryActive(user.id, categoryId, !currentStatus);
      loadCategories();
    } catch (error: any) {
      if (error?.message?.includes('Categoria em uso')) {
        Alert.alert(
          'Não é possível desativar',
          'Esta categoria está sendo usada por uma ou mais receitas. Altere a categoria dessas receitas antes de desativá-la.'
        );
      } else {
        Alert.alert('Erro ao atualizar', 'Não foi possível atualizar a categoria. Tente novamente.');
      }
    }
  };

  const handleDelete = (categoryId: string) => {
    Alert.alert('Excluir Categoria', 'Deseja realmente excluir esta categoria? Ela deixará de aparecer nas suas receitas.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteCustomCategory(categoryId);
            loadCategories();
          } catch (error: any) {
            const emUso = error?.message?.includes('Categoria em uso');
            Alert.alert(
              emUso ? 'Categoria em uso' : 'Erro ao excluir',
              emUso
                ? 'Esta categoria está sendo usada por uma ou mais receitas. Altere a categoria dessas receitas antes de excluí-la.'
                : 'Não foi possível excluir a categoria. Tente novamente.'
            );
          }
        }
      }
    ]);
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.description}>
          Selecione as categorias e restrições alimentares que você tem interesse, para personalizar seu feed.
        </Text>
      </View>

      {isAdding ? (
        <View style={styles.addCard}>
          <TextInput
            style={styles.input}
            placeholder="Nome da categoria (ex: Vegano)"
            placeholderTextColor={colors.textSecondary}
            value={newCatName}
            onChangeText={setNewCatName}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleCreate}
          />
          <View style={styles.addActions}>
            <TouchableOpacity onPress={() => setIsAdding(false)} style={styles.cancelBtn}>
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleCreate} style={styles.saveBtn}>
              <Text style={styles.saveBtnText}>Salvar</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity style={styles.addBtn} onPress={() => setIsAdding(true)}>
          <Feather name="plus-circle" size={24} color={colors.primary} />
          <Text style={styles.addBtnText}>Nova Categoria Personalizada</Text>
        </TouchableOpacity>
      )}

      <FlatList
        data={categories}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <View style={[styles.categoryItem, !item.isActive && styles.categoryInactive]}>
             <TouchableOpacity
               style={styles.categoryInfo}
               onPress={() => handleToggleActive(item.id, item.isActive)}
               activeOpacity={0.7}
             >
               <Feather
                 name={item.isActive ? "check-circle" : "circle"}
                 size={24}
                 color={item.isActive ? colors.primary : colors.textSecondary}
               />
               <Text style={[styles.categoryName, !item.isActive && styles.categoryNameInactive]}>
                 {item.name} {item.isCustom ? '(Personalizada)' : ''}
               </Text>
             </TouchableOpacity>

             {item.isCustom && (
               <TouchableOpacity
                 style={styles.deleteBtn}
                 onPress={() => handleDelete(item.id)}
               >
                 <Feather name="trash-2" size={20} color={colors.error} />
               </TouchableOpacity>
             )}
          </View>
        )}
      />
    </View>
  );
};
