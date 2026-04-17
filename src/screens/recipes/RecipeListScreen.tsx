import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, TextInput, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator, Modal, ScrollView, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { useDebounce } from '../../hooks/useDebounce';
import { useRecipes } from '../../hooks/useRecipes';
import { RecipeCard } from '../../components/recipe/RecipeCard';
import { getCategories } from '../../services/sqlite/categoryService';
import { useAuthStore } from '../../store/authStore';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import { useTimersStore } from '../../store/timersStore';

export const RecipeListScreen = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const { colors, fontSizes } = useTheme();
  const styles = getStyles(colors);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [localSearch, setLocalSearch] = useState('');
  const [categoryList, setCategoryList] = useState<string[]>([]);
  
  const { recipes, isLoading, error, fetchRecipes, applyFilters, filters, refresh } = useRecipes();
  const { timers, openDrawer } = useTimersStore();
  const activeTimerCount = timers.filter(t => !t.isDone).length;
  
  const debouncedSearch = useDebounce(localSearch, 300);

  useFocusEffect(
    useCallback(() => {
      refresh();
      if (user?.id) {
        getCategories(user.id)
          .then(cats => setCategoryList(Array.isArray(cats) ? cats.map(c => c.name) : []))
          .catch(() => {});
      }
    }, [user?.id])
  );

  useEffect(() => {
    fetchRecipes(debouncedSearch, filters);
  }, [debouncedSearch]);

  const toggleCategory = (cat: string) => {
    const currentCategories = filters.categories || [];
    const newCategories = currentCategories.includes(cat)
      ? currentCategories.filter(c => c !== cat)
      : [...currentCategories, cat];
      
    applyFilters({ ...filters, categories: newCategories });
  };

  const clearFilters = () => {
    applyFilters({});
    setFilterModalVisible(false);
  };

  const EmptyState = useMemo(
    () => (
      <View style={styles.emptyContainer}>
        <Feather name="book-open" size={64} color={colors.border} />
        <Text style={styles.emptyText}>Nenhuma receita encontrada.</Text>
        <Text style={styles.emptySubText}>Tente buscar por outros termos ou adicionar uma nova receita!</Text>
      </View>
    ),
    [],
  );

  const addButton = (
    <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('CreateRecipe')} accessibilityLabel="Nova receita" accessibilityRole="button">
      <Feather name="plus" size={22} color="#fff" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Minhas Receitas" right={addButton} />

      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Feather name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Buscar receitas, ingredientes..."
            placeholderTextColor={colors.textSecondary}
            value={localSearch}
            onChangeText={setLocalSearch}
            returnKeyType="done"
          />
          {localSearch ? (
            <TouchableOpacity onPress={() => setLocalSearch('')}>
              <Feather name="x-circle" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>
        <TouchableOpacity style={[styles.filterBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => setFilterModalVisible(true)}>
          <Feather name="filter" size={20} color={filters.categories?.length ? colors.primary : colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {error ? (
        <View style={styles.center}><Text style={styles.errorText}>{error}</Text></View>
      ) : isLoading && recipes.length === 0 ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={recipes}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <RecipeCard recipe={item} onPress={() => navigation.navigate('RecipeDetail', { recipeId: item.id })} />}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={EmptyState}
          showsVerticalScrollIndicator={false}
          onRefresh={refresh}
          refreshing={isLoading}
        />
      )}

      {/* FAB — Timer */}
      <TouchableOpacity
        style={styles.timerFab}
        onPress={() => openDrawer()}
        accessibilityLabel="Abrir timers"
        accessibilityRole="button"
      >
        <Feather name="clock" size={22} color="#fff" />
        {activeTimerCount > 0 && (
          <View style={styles.timerBadge}>
            <Text style={styles.timerBadgeText}>{activeTimerCount}</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* MODAL DE FILTROS */}
      <Modal visible={filterModalVisible} animationType="slide" transparent onRequestClose={() => setFilterModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setFilterModalVisible(false)}>
          <TouchableOpacity style={[styles.modalContent, { backgroundColor: colors.background }]} activeOpacity={1} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Filtros</Text>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                <Feather name="x" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.filterSectionTitle, { color: colors.text }]}>Categorias</Text>
              <View style={styles.chipsContainer}>
                {categoryList.map(cat => {
                  const isSelected = filters.categories?.includes(cat);
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[styles.chip, { backgroundColor: colors.surface, borderColor: colors.border }, isSelected && styles.chipSelected]}
                      onPress={() => toggleCategory(cat)}
                    >
                      <Text style={[styles.chipText, { color: colors.text }, isSelected && styles.chipTextSelected]}>{cat}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            <View style={[styles.modalFooter, { borderColor: colors.border }]}>
              <TouchableOpacity style={[styles.clearBtn, { backgroundColor: colors.surface }]} onPress={clearFilters}>
                <Text style={[styles.clearBtnText, { color: colors.text }]}>Limpar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyBtn} onPress={() => setFilterModalVisible(false)}>
                <Text style={styles.applyBtnText}>Aplicar Filtros</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

    </SafeAreaView>
  );
};

const getStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  addBtn: { backgroundColor: colors.primary, padding: theme.spacing.sm, borderRadius: theme.borderRadius.round },
  searchContainer: { flexDirection: 'row', padding: theme.spacing.md, gap: theme.spacing.sm },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: theme.borderRadius.md, paddingHorizontal: theme.spacing.md, borderWidth: 1, borderColor: colors.border },
  searchIcon: { marginRight: theme.spacing.sm },
  searchInput: { flex: 1, height: 44, color: colors.text },
  filterBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surface, borderRadius: theme.borderRadius.md, borderWidth: 1, borderColor: colors.border },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: colors.error },
  listContent: { padding: theme.spacing.md, paddingBottom: 100 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 60, padding: theme.spacing.lg },
  emptyText: { fontSize: 18, fontWeight: 'bold', color: colors.text, marginTop: theme.spacing.md },
  emptySubText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginTop: theme.spacing.xs },
  
  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: theme.borderRadius.lg, borderTopRightRadius: theme.borderRadius.lg, padding: theme.spacing.lg, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.lg },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text },
  filterSectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: theme.spacing.sm, color: colors.text },
  chipsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, marginBottom: theme.spacing.lg },
  chip: { paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, borderRadius: theme.borderRadius.round, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text },
  chipTextSelected: { color: '#fff', fontWeight: 'bold' },
  modalFooter: { flexDirection: 'row', gap: theme.spacing.md, paddingTop: theme.spacing.md, borderTopWidth: 1, borderColor: colors.border },
  clearBtn: { flex: 1, padding: theme.spacing.md, alignItems: 'center', borderRadius: theme.borderRadius.md, backgroundColor: colors.surface },
  clearBtnText: { color: colors.text, fontWeight: 'bold' },
  applyBtn: { flex: 2, padding: theme.spacing.md, alignItems: 'center', borderRadius: theme.borderRadius.md, backgroundColor: colors.primary },
  applyBtnText: { color: '#fff', fontWeight: 'bold' },
  timerFab: {
    position: 'absolute',
    bottom: 24,
    right: 16,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  timerBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  timerBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
});