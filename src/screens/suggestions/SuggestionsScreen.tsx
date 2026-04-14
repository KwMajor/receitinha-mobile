import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Modal, ScrollView,
  Alert, Animated, Platform, Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { theme } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuthStore } from '../../store/authStore';
import {
  getItems as getPantryItems,
  addItem as addPantryItem,
  removeItem as removePantryItem,
  importFromShoppingList,
  clearPantry,
  PantryItem,
} from '../../services/sqlite/pantryService';
import { getSuggestions, MatchResult } from '../../services/suggestionService';
import { getLists } from '../../services/sqlite/shoppingService';
import { ShoppingList } from '../../types';
import { SuggestionCard } from '../../components/recipe/SuggestionCard';
import { ScreenHeader } from '../../components/common/ScreenHeader';

// ── Styles ────────────────────────────────────────────────────────────────────

const getStyles = (colors: any) => StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  // Tab bar
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  tab: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabLabelActive: {
    color: colors.primary,
  },
  // Pantry tab
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    height: 42,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    marginLeft: theme.spacing.sm,
    fontSize: 14,
  },
  importBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  importBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  pantryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  pantryItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  pantryItemName: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    fontWeight: '500',
  },
  pantryItemMeta: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  removeBtn: {
    padding: 8,
  },
  // Footer add bar
  addBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderTopWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    gap: theme.spacing.sm,
  },
  addInput: {
    flex: 1,
    height: 44,
    backgroundColor: colors.surface,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    fontSize: 14,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Suggestions tab
  listContent: {
    padding: theme.spacing.md,
    paddingBottom: 100,
  },
  // Empty states
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.sm,
  },
  emptyBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  // Toast
  toast: {
    position: 'absolute',
    bottom: 90,
    left: theme.spacing.lg,
    right: theme.spacing.lg,
    backgroundColor: colors.success,
    borderRadius: theme.borderRadius.md,
    paddingVertical: 12,
    paddingHorizontal: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  toastText: {
    flex: 1,
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  // Import modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: theme.borderRadius.lg,
    borderTopRightRadius: theme.borderRadius.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
    maxHeight: '60%',
  },
  modalHandle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: theme.spacing.md,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderColor: colors.border,
    marginBottom: 4,
  },
  listPickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: colors.border,
    gap: theme.spacing.sm,
  },
  listPickerName: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
  },
  listPickerMeta: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  noLists: {
    padding: theme.spacing.xl,
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: 14,
  },
  clearBtn: {
    padding: theme.spacing.md,
  },
});

// ── Screen ────────────────────────────────────────────────────────────────────

type TabName = 'pantry' | 'suggestions';

export const SuggestionsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const [activeTab, setActiveTab] = useState<TabName>('pantry');

  // ── Pantry state ─────────────────────────────────────────────────────────
  const [pantryItems, setPantryItems]   = useState<PantryItem[]>([]);
  const [pantrySearch, setPantrySearch] = useState('');
  const [addName, setAddName]           = useState('');
  const [loadingPantry, setLoadingPantry] = useState(true);

  // ── Suggestions state ────────────────────────────────────────────────────
  const [suggestions, setSuggestions]         = useState<MatchResult[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [suggestionsLoaded, setSuggestionsLoaded]   = useState(false);

  // ── Import modal ─────────────────────────────────────────────────────────
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [shoppingLists, setShoppingLists]           = useState<ShoppingList[]>([]);

  // ── Toast ─────────────────────────────────────────────────────────────────
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const [toastMsg, setToastMsg] = useState('');

  const showToast = (msg: string) => {
    setToastMsg(msg);
    Animated.sequence([
      Animated.timing(toastOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(2200),
      Animated.timing(toastOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  };

  // ── Load pantry on focus ──────────────────────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      setLoadingPantry(true);
      getPantryItems(user.id)
        .then(items => setPantryItems(Array.isArray(items) ? items : []))
        .catch(() => setPantryItems([]))
        .finally(() => setLoadingPantry(false));
    }, [user]),
  );

  // ── Suggestions helpers ───────────────────────────────────────────────────
  const loadSuggestions = async () => {
    if (!user) return;
    setLoadingSuggestions(true);
    try {
      const results = await getSuggestions(user.id);
      setSuggestions(Array.isArray(results) ? results : []);
      setSuggestionsLoaded(true);
    } catch {
      setSuggestions([]);
      setSuggestionsLoaded(true);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  // ── Pantry helpers ────────────────────────────────────────────────────────
  const filteredPantry = pantrySearch.trim()
    ? pantryItems.filter(p =>
        p.ingredientName.toLowerCase().includes(pantrySearch.toLowerCase()),
      )
    : pantryItems;

  const handleAdd = async () => {
    const name = addName.trim();
    if (!name || !user) return;
    Keyboard.dismiss();
    await addPantryItem(user.id, name);
    setAddName('');
    const updated = await getPantryItems(user.id);
    setPantryItems(updated);
    loadSuggestions();
  };

  const handleRemove = async (item: PantryItem) => {
    if (!user) return;
    await removePantryItem(user.id, item.ingredientName);
    setPantryItems(prev => prev.filter(p => p.id !== item.id));
    loadSuggestions();
  };

  const handleClearPantry = () => {
    if (!user) return;
    Alert.alert(
      'Limpar despensa',
      'Tem certeza que deseja remover todos os ingredientes?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpar',
          style: 'destructive',
          onPress: async () => {
            await clearPantry(user.id);
            setPantryItems([]);
            setSuggestions([]);
            setSuggestionsLoaded(true);
          },
        },
      ],
    );
  };

  // ── Import helpers ────────────────────────────────────────────────────────
  const openImportModal = async () => {
    if (!user) return;
    try {
      const lists = await getLists(user.id);
      setShoppingLists(Array.isArray(lists) ? lists : []);
    } catch {
      setShoppingLists([]);
    }
    setImportModalVisible(true);
  };

  const handleImport = async (list: ShoppingList) => {
    if (!user) return;
    setImportModalVisible(false);
    const count = await importFromShoppingList(user.id, list.id);
    const updated = await getPantryItems(user.id);
    setPantryItems(updated);
    loadSuggestions();
    showToast(
      count > 0
        ? `${count} ingrediente${count !== 1 ? 's' : ''} adicionado${count !== 1 ? 's' : ''} à despensa`
        : 'Nenhum item comprado encontrado na lista',
    );
  };

  const handleTabChange = (tab: TabName) => {
    setActiveTab(tab);
    if (tab === 'suggestions') {
      loadSuggestions();
    }
  };

  // ── Render pantry item ────────────────────────────────────────────────────
  const renderPantryItem = ({ item }: { item: PantryItem }) => (
    <View style={styles.pantryItem}>
      <View style={styles.pantryItemIcon}>
        <Feather name="box" size={16} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.pantryItemName}>{item.ingredientName}</Text>
        {(item.quantity != null || item.unit) && (
          <Text style={styles.pantryItemMeta}>
            {[item.quantity?.toString(), item.unit].filter(Boolean).join(' ')}
          </Text>
        )}
      </View>
      <TouchableOpacity style={styles.removeBtn} onPress={() => handleRemove(item)}>
        <Feather name="trash-2" size={18} color={colors.error} />
      </TouchableOpacity>
    </View>
  );

  // ── Header right buttons ──────────────────────────────────────────────────
  const pantryHeaderRight = (
    <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
      <TouchableOpacity style={styles.importBtn} onPress={openImportModal}>
        <Feather name="download" size={14} color={colors.primary} />
        <Text style={styles.importBtnText}>Importar</Text>
      </TouchableOpacity>
      {pantryItems.length > 0 && (
        <TouchableOpacity style={styles.clearBtn} onPress={handleClearPantry}>
          <Feather name="trash" size={18} color={colors.error} />
        </TouchableOpacity>
      )}
    </View>
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.flex} edges={['top']}>
      <ScreenHeader
        title="Sugestões"
        right={activeTab === 'pantry' ? pantryHeaderRight : undefined}
      />

      {/* ── Tab bar ── */}
      <View style={styles.tabBar}>
        {(['pantry', 'suggestions'] as TabName[]).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => handleTabChange(tab)}
          >
            <Text style={[styles.tabLabel, activeTab === tab && styles.tabLabelActive]}>
              {tab === 'pantry' ? `Despensa (${pantryItems.length})` : 'Sugestões'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── PANTRY TAB ── */}
      {activeTab === 'pantry' && (
        <View style={styles.flex}>
          {/* Search */}
          <View style={styles.searchRow}>
            <View style={styles.searchBar}>
              <Feather name="search" size={16} color={colors.textSecondary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Filtrar ingredientes..."
                placeholderTextColor={colors.textSecondary}
                value={pantrySearch}
                onChangeText={setPantrySearch}
                returnKeyType="search"
              />
              {pantrySearch ? (
                <TouchableOpacity onPress={() => setPantrySearch('')}>
                  <Feather name="x" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          {loadingPantry ? (
            <View style={styles.empty}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : pantryItems.length === 0 ? (
            <View style={styles.empty}>
              <Feather name="box" size={56} color={colors.border} />
              <Text style={styles.emptyTitle}>Despensa vazia</Text>
              <Text style={styles.emptySubtitle}>
                Adicione ingredientes que você tem em casa para receber sugestões de receitas personalizadas.
              </Text>
            </View>
          ) : filteredPantry.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptySubtitle}>Nenhum ingrediente encontrado para "{pantrySearch}".</Text>
            </View>
          ) : (
            <FlatList
              data={filteredPantry}
              keyExtractor={item => item.id}
              renderItem={renderPantryItem}
              keyboardShouldPersistTaps="handled"
            />
          )}

          {/* Footer add bar */}
          <View style={styles.addBar}>
            <TextInput
              style={styles.addInput}
              placeholder="Adicionar ingrediente..."
              placeholderTextColor={colors.textSecondary}
              value={addName}
              onChangeText={setAddName}
              returnKeyType="done"
              onSubmitEditing={handleAdd}
            />
            <TouchableOpacity
              style={[styles.addBtn, !addName.trim() && { opacity: 0.4 }]}
              onPress={handleAdd}
              disabled={!addName.trim()}
            >
              <Feather name="plus" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── SUGGESTIONS TAB ── */}
      {activeTab === 'suggestions' && (
        <View style={styles.flex}>
          {loadingSuggestions ? (
            <View style={styles.empty}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.emptySubtitle}>Calculando sugestões...</Text>
            </View>
          ) : !suggestionsLoaded ? (
            <View style={styles.empty}>
              <Feather name="cpu" size={56} color={colors.border} />
              <Text style={styles.emptyTitle}>Pronto para sugerir</Text>
              <Text style={styles.emptySubtitle}>
                Toque em "Atualizar" para calcular quais receitas você pode fazer com os ingredientes da sua despensa.
              </Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={loadSuggestions}>
                <Text style={styles.emptyBtnText}>Ver sugestões</Text>
              </TouchableOpacity>
            </View>
          ) : pantryItems.length === 0 ? (
            <View style={styles.empty}>
              <Feather name="box" size={56} color={colors.border} />
              <Text style={styles.emptyTitle}>Despensa vazia</Text>
              <Text style={styles.emptySubtitle}>
                Adicione ingredientes à sua despensa para receber sugestões de receitas.
              </Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => setActiveTab('pantry')}>
                <Text style={styles.emptyBtnText}>Adicionar ingredientes</Text>
              </TouchableOpacity>
            </View>
          ) : suggestions.length === 0 ? (
            <View style={styles.empty}>
              <Feather name="frown" size={56} color={colors.border} />
              <Text style={styles.emptyTitle}>Sem sugestões ainda</Text>
              <Text style={styles.emptySubtitle}>
                Nenhuma receita usa pelo menos 50% dos seus ingredientes. Adicione mais itens à despensa!
              </Text>
            </View>
          ) : (
            <FlatList
              data={suggestions}
              keyExtractor={item => item.recipe.id}
              renderItem={({ item }) => (
                <SuggestionCard
                  match={item}
                  onPress={() => navigation.navigate('RecipeDetail', { recipeId: item.recipe.id })}
                />
              )}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      )}

      {/* ── Toast ── */}
      <Animated.View style={[styles.toast, { opacity: toastOpacity }]} pointerEvents="none">
        <Feather name="check-circle" size={18} color="#fff" />
        <Text style={styles.toastText}>{toastMsg}</Text>
      </Animated.View>

      {/* ── Import modal ── */}
      <Modal
        visible={importModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setImportModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setImportModalVisible(false)}
        >
          <TouchableOpacity style={styles.modalSheet} activeOpacity={1} onPress={() => {}}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Importar da lista de compras</Text>
            {shoppingLists.length === 0 ? (
              <Text style={styles.noLists}>Nenhuma lista de compras encontrada.</Text>
            ) : (
              <ScrollView>
                {shoppingLists.map(list => (
                  <TouchableOpacity
                    key={list.id}
                    style={styles.listPickerItem}
                    onPress={() => handleImport(list)}
                  >
                    <Feather name="shopping-cart" size={18} color={colors.primary} />
                    <Text style={styles.listPickerName}>{list.name}</Text>
                    {list.pendingCount != null && (
                      <Text style={styles.listPickerMeta}>
                        {list.itemCount} itens
                      </Text>
                    )}
                    <Feather name="chevron-right" size={16} color={colors.border} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};
