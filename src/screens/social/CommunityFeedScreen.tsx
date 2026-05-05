import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { CATEGORIES } from '../../constants/categories';
import { CommunityRecipeCard } from '../../components/recipe/CommunityRecipeCard';
import { getFeed } from '../../services/api/communityService';
import { useCommunityStore } from '../../store/communityStore';
import { PublicRecipe } from '../../types';
import { ScreenHeader } from '../../components/common/ScreenHeader';

export const CommunityFeedScreen = () => {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const { feed, nextCursor, isLoading, error, setFeed, appendFeed, setLoading, setError, setCursor } =
    useCommunityStore();

  const [showSearch, setShowSearch] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const isFetchingNext = useRef(false);

  // ── Carrega primeira página ──────────────────────────────────────────────
  const loadInitial = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getFeed(undefined, 20);
      setFeed(data.recipes);
      setCursor(data.nextCursor);
    } catch (e: any) {
      setError(e?.message ?? 'Erro ao carregar o feed.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  // ── Pull-to-refresh ──────────────────────────────────────────────────────
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const data = await getFeed(undefined, 20);
      setFeed(data.recipes);
      setCursor(data.nextCursor);
    } catch {
      // silencia — dados anteriores permanecem
    } finally {
      setRefreshing(false);
    }
  };

  // ── Paginação ────────────────────────────────────────────────────────────
  const fetchNextPage = async () => {
    if (!nextCursor || isFetchingNext.current || isLoading) return;
    isFetchingNext.current = true;
    try {
      const data = await getFeed(nextCursor, 20);
      appendFeed(data.recipes);
      setCursor(data.nextCursor);
    } catch {
      // silencia erro de paginação
    } finally {
      isFetchingNext.current = false;
    }
  };

  // ── Filtro local por query e/ou categoria ───────────────────────────────
  const displayedFeed: PublicRecipe[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    return feed.filter((r) => {
      const matchesQuery =
        !q ||
        r.title.toLowerCase().includes(q) ||
        r.authorName.toLowerCase().includes(q);
      const matchesCategory =
        !selectedCategory ||
        r.category.toLowerCase() === selectedCategory.toLowerCase();
      return matchesQuery && matchesCategory;
    });
  }, [feed, query, selectedCategory]);

  // ── Estado vazio ─────────────────────────────────────────────────────────
  const hasActiveFilter = query.trim().length > 0 || selectedCategory !== null;

  const feedListFooter = useMemo(
    () => (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    ),
    [],
  );

  const feedListEmpty = useMemo(
    () => (
      <View style={styles.emptyContainer}>
        <Feather name="globe" size={64} color={colors.border} />
        <Text style={styles.emptyTitle}>
          {hasActiveFilter ? 'Nenhuma receita encontrada' : 'A comunidade está vazia'}
        </Text>
        <Text style={styles.emptySubtitle}>
          {hasActiveFilter
            ? 'Tente outro termo ou categoria.'
            : 'Seja o primeiro a compartilhar uma receita!'}
        </Text>
      </View>
    ),
    [hasActiveFilter],
  );

  const headerRight = (
    <View style={styles.headerActions}>
      {selectedCategory && (
        <TouchableOpacity
          style={styles.filterBadge}
          onPress={() => setSelectedCategory(null)}
          accessibilityLabel={`Remover filtro ${selectedCategory}`}
          accessibilityRole="button"
        >
          <Text style={styles.filterBadgeText} numberOfLines={1}>
            {selectedCategory}
          </Text>
          <Feather name="x" size={12} color={colors.primary} />
        </TouchableOpacity>
      )}
      <TouchableOpacity
        style={styles.iconBtn}
        onPress={() => {
          setShowSearch((prev) => !prev);
          if (showSearch) setQuery('');
        }}
        accessibilityLabel={showSearch ? 'Fechar busca' : 'Abrir busca'}
        accessibilityRole="button"
      >
        <Feather
          name={showSearch ? 'x' : 'search'}
          size={22}
          color={colors.text}
        />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Comunidade" right={headerRight} />

      {/* ── SearchBar ── */}
      {showSearch && (
        <View style={styles.searchBar}>
          <Feather name="search" size={16} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nome de receita…"
            placeholderTextColor={colors.textSecondary}
            value={query}
            onChangeText={setQuery}
            autoFocus
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Feather name="x" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ── Chips de categoria ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsContainer}
        style={styles.chipsScroll}
      >
        <TouchableOpacity
          style={[styles.chip, selectedCategory === null && styles.chipActive]}
          onPress={() => setSelectedCategory(null)}
        >
          <Text style={[styles.chipText, selectedCategory === null && styles.chipTextActive]}>
            Todas
          </Text>
        </TouchableOpacity>
        {CATEGORIES.map((cat) => {
          const active = selectedCategory === cat;
          return (
            <TouchableOpacity
              key={cat}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => setSelectedCategory(active ? null : cat)}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── Erro ── */}
      {error && !isLoading && (
        <View style={styles.errorBanner}>
          <Feather name="alert-circle" size={16} color={colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={loadInitial}>
            <Text style={styles.retryText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Loading inicial ── */}
      {isLoading && feed.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={displayedFeed}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <CommunityRecipeCard
              recipe={item}
              onPress={() =>
                navigation.navigate('SocialStack', {
                  screen: 'PublicRecipe',
                  params: { recipeId: item.id, recipe: item },
                })
              }
            />
          )}
          contentContainerStyle={styles.listContent}
          onEndReached={fetchNextPage}
          onEndReachedThreshold={0.4}
          ListFooterComponent={nextCursor ? feedListFooter : null}
          ListEmptyComponent={isLoading ? null : feedListEmpty}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

const getStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  filterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary + '18',
    borderRadius: theme.borderRadius.round,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    maxWidth: 120,
  },
  filterBadgeText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
    flexShrink: 1,
  },
  iconBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: colors.surface,
  },
  // ── Chips de categoria ──────────────────────────────────────────────────
  chipsScroll: {
    flexGrow: 0,
    flexShrink: 0,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  chipsContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.round,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginHorizontal: theme.spacing.lg,
    marginVertical: theme.spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: theme.borderRadius.round,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    padding: 0,
  },
  listContent: {
    padding: theme.spacing.lg,
    paddingBottom: 100,
  },
  footer: {
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: theme.spacing.md,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: '#FFF0EE',
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.sm,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    flexWrap: 'wrap',
  },
  errorText: { flex: 1, fontSize: 13, color: colors.error },
  retryText: { fontSize: 13, color: colors.primary, fontWeight: 'bold' },
});
