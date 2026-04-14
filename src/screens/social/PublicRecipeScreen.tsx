import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { formatTime, formatQuantity, formatUnit } from '../../utils/formatters';
import { PublicRecipe, Rating } from '../../types';
import {
  getPublicRecipe,
  savePublicRecipeLocally,
  flagRecipe,
  getRatings,
  getUserRating,
} from '../../services/api/communityService';
import { useCommunityStore } from '../../store/communityStore';
import { RatingCard } from '../../components/social/RatingCard';
import { RatingSummary } from '../../components/social/RatingSummary';
import { RateRecipeModal } from '../../components/social/RateRecipeModal';
import { StarRating } from '../../components/social/StarRating';

// ─── Toast inline ─────────────────────────────────────────────────────────────
function Toast({ message, visible }: { message: string; visible: boolean }) {
  const { colors } = useTheme();
  const toastStyles = getToastStyles(colors);
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (visible) {
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.delay(2000),
        Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);
  return (
    <Animated.View style={[toastStyles.container, { opacity }]} pointerEvents="none">
      <Feather name="check-circle" size={16} color="#fff" />
      <Text style={toastStyles.text}>{message}</Text>
    </Animated.View>
  );
}
const getToastStyles = (colors: any) => StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 110,
    left: 24,
    right: 24,
    backgroundColor: colors.success,
    borderRadius: theme.borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: theme.spacing.md,
    elevation: 6,
    zIndex: 99,
  },
  text: { color: '#fff', fontWeight: '600', fontSize: 14, flex: 1 },
});

// ─── Avatar com iniciais ───────────────────────────────────────────────────────
function AuthorAvatar({ name }: { name: string }) {
  const { colors } = useTheme();
  const avatarStyles = getAvatarStyles(colors);
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? '')
    .join('');
  return (
    <View style={avatarStyles.circle}>
      <Text style={avatarStyles.initials}>{initials}</Text>
    </View>
  );
}
const getAvatarStyles = (colors: any) => StyleSheet.create({
  circle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});

// ─── Tela principal ───────────────────────────────────────────────────────────
export const PublicRecipeScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const { recipeId, recipe: preloaded } = route.params as {
    recipeId: string;
    recipe?: PublicRecipe;
  };

  const { updateFeedRating } = useCommunityStore();

  // ── Estado da receita ──────────────────────────────────────────────────────
  const [recipe, setRecipe] = useState<PublicRecipe | null>(preloaded ?? null);
  const [loading, setLoading] = useState(!preloaded);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'ingredients' | 'steps'>('ingredients');

  // ── Estado das avaliações ──────────────────────────────────────────────────
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [ratingsCursor, setRatingsCursor] = useState<string | null>(null);
  const [ratingsLoading, setRatingsLoading] = useState(false);
  const [userRating, setUserRating] = useState<Rating | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState(false);
  const isFetchingNextRatings = useRef(false);

  // distribuição de estrelas (índice 0 = 1★ … índice 4 = 5★)
  const distribution = useRef<number[]>([0, 0, 0, 0, 0]);

  // ── Carregamento inicial ───────────────────────────────────────────────────
  useEffect(() => {
    if (!preloaded) {
      getPublicRecipe(recipeId)
        .then(setRecipe)
        .catch(() => Alert.alert('Erro', 'Não foi possível carregar a receita.'))
        .finally(() => setLoading(false));
    }
    loadRatings();
    loadUserRating();
  }, [recipeId]);

  const loadRatings = async (cursor?: string) => {
    setRatingsLoading(true);
    try {
      const data = await getRatings(recipeId, cursor);
      if (cursor) {
        setRatings((prev) => [...prev, ...data.ratings]);
      } else {
        setRatings(data.ratings);
        // Recalcula distribuição
        const dist = [0, 0, 0, 0, 0];
        data.ratings.forEach((r) => { dist[r.stars - 1]++; });
        distribution.current = dist;
      }
      setRatingsCursor(data.nextCursor);
    } catch {
      // silencia
    } finally {
      setRatingsLoading(false);
    }
  };

  const loadUserRating = async () => {
    try {
      const r = await getUserRating(recipeId);
      setUserRating(r);
    } catch {
      // silencia
    }
  };

  // ── Pull-to-refresh ────────────────────────────────────────────────────────
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const [recipeData, ratingsData, ur] = await Promise.all([
        getPublicRecipe(recipeId),
        getRatings(recipeId),
        getUserRating(recipeId),
      ]);
      setRecipe(recipeData);
      setRatings(ratingsData.ratings);
      setRatingsCursor(ratingsData.nextCursor);
      setUserRating(ur);
      const dist = [0, 0, 0, 0, 0];
      ratingsData.ratings.forEach((r) => { dist[r.stars - 1]++; });
      distribution.current = dist;
    } catch {
      // silencia
    } finally {
      setRefreshing(false);
    }
  };

  // ── Paginação de ratings ───────────────────────────────────────────────────
  const fetchNextRatings = async () => {
    if (!ratingsCursor || isFetchingNextRatings.current || ratingsLoading) return;
    isFetchingNextRatings.current = true;
    await loadRatings(ratingsCursor);
    isFetchingNextRatings.current = false;
  };

  // ── Salvar ─────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!recipe || saving) return;
    setSaving(true);
    try {
      await savePublicRecipeLocally(recipe);
      Alert.alert('Salvo!', 'A receita foi adicionada às suas receitas.');
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar a receita.');
    } finally {
      setSaving(false);
    }
  };

  // ── Denunciar ──────────────────────────────────────────────────────────────
  const handleFlag = () => {
    if (!recipe) return;
    Alert.alert(
      'Denunciar receita',
      'Tem certeza que deseja denunciar esta receita como inapropriada?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Denunciar',
          style: 'destructive',
          onPress: async () => {
            try {
              await flagRecipe(recipe.id);
              Alert.alert('Obrigado', 'Sua denúncia foi registrada.');
            } catch {
              Alert.alert('Erro', 'Não foi possível enviar a denúncia.');
            }
          },
        },
      ],
    );
  };

  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  // ── Avaliação submetida ────────────────────────────────────────────────────
  const handleRatingSubmitted = (saved: Rating) => {
    setShowModal(false);
    setUserRating(saved);

    // Atualiza lista local
    setRatings((prev) => {
      const idx = prev.findIndex((r) => r.userId === saved.userId);
      return idx >= 0
        ? prev.map((r, i) => (i === idx ? saved : r))
        : [saved, ...prev];
    });

    // Recalcula média e conta no store para atualizar o feed
    if (recipe) {
      const allRatings = ratings.some((r) => r.userId === saved.userId)
        ? ratings.map((r) => (r.userId === saved.userId ? saved : r))
        : [saved, ...ratings];
      const total = allRatings.length;
      const avg = total > 0
        ? allRatings.reduce((s, r) => s + r.stars, 0) / total
        : 0;
      updateFeedRating(recipe.id, avg, total);
      setRecipe((r) => r ? { ...r, averageRating: avg, ratingCount: total } : r);
    }

    // Toast
    setToast(true);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(false), 3000);
  };

  // ── Header da FlatList (todo o conteúdo da receita + seção de avaliações) ──
  const ListHeader = useCallback(() => {
    if (!recipe) return null;
    return (
      <View>
        {/* ── Imagem ── */}
        <View style={styles.imageContainer}>
          {recipe.photoUrl ? (
            <Image source={{ uri: recipe.photoUrl }} style={styles.image} />
          ) : (
            <View style={[styles.image, styles.imagePlaceholder]}>
              <Feather name="image" size={48} color={colors.textSecondary} />
            </View>
          )}
          <SafeAreaView edges={['top']} style={styles.headerOverlay}>
            <TouchableOpacity
              style={styles.headerBtn}
              onPress={() => navigation.goBack()}
              accessibilityLabel="Voltar"
              accessibilityRole="button"
            >
              <Feather name="arrow-left" size={24} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerBtn}
              onPress={handleFlag}
              accessibilityLabel="Denunciar receita"
              accessibilityRole="button"
            >
              <Feather name="flag" size={22} color={colors.error} />
            </TouchableOpacity>
          </SafeAreaView>
        </View>

        <View style={styles.content}>
          {/* ── Autor ── */}
          <View style={styles.authorCard}>
            <AuthorAvatar name={recipe.authorName} />
            <View style={styles.authorInfo}>
              <Text style={styles.authorLabel}>Publicado por</Text>
              <Text style={styles.authorName}>{recipe.authorName}</Text>
            </View>
          </View>

          {/* ── Info da receita ── */}
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{recipe.category}</Text>
          </View>
          <Text style={styles.title}>{recipe.title}</Text>
          {recipe.description ? (
            <Text style={styles.description}>{recipe.description}</Text>
          ) : null}

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Feather name="clock" size={18} color={colors.primary} />
              <View>
                <Text style={styles.metaLabel}>Tempo</Text>
                <Text style={styles.metaValue}>{formatTime(recipe.prepTime)}</Text>
              </View>
            </View>
            <View style={styles.metaDivider} />
            <View style={styles.metaItem}>
              <Feather name="users" size={18} color={colors.primary} />
              <View>
                <Text style={styles.metaLabel}>Porções</Text>
                <Text style={styles.metaValue}>
                  {recipe.servings} {recipe.servings === 1 ? 'porção' : 'porções'}
                </Text>
              </View>
            </View>
          </View>

          {/* ── Tabs ingredientes / preparo ── */}
          <View style={styles.tabsContainer} accessibilityRole="tablist">
            {(['ingredients', 'steps'] as const).map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, activeTab === tab && styles.activeTab]}
                onPress={() => setActiveTab(tab)}
                accessibilityRole="tab"
                accessibilityState={{ selected: activeTab === tab }}
              >
                <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                  {tab === 'ingredients' ? 'Ingredientes' : 'Preparo'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.tabContent}>
            {activeTab === 'ingredients' ? (
              recipe.ingredients.map((ing, i) => (
                <View key={i} style={styles.ingredientRow}>
                  <View style={styles.bullet} />
                  <Text style={styles.ingredientText}>
                    <Text style={styles.bold}>
                      {formatQuantity(ing.quantity)} {formatUnit(ing.quantity, ing.unit)}
                    </Text>
                    {' '}de {ing.name}
                  </Text>
                </View>
              ))
            ) : (
              recipe.steps.map((step, i) => (
                <View key={i} style={styles.stepRow}>
                  <View style={styles.stepBadge}>
                    <Text style={styles.stepNum}>{i + 1}</Text>
                  </View>
                  <View style={styles.stepContent}>
                    <Text style={styles.stepText}>{step.instruction}</Text>
                    {step.timer_minutes ? (
                      <View style={styles.timerBadge}>
                        <Feather name="clock" size={12} color={colors.textSecondary} />
                        <Text style={styles.timerText}>{step.timer_minutes} min</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              ))
            )}
          </View>

          {/* ── Botão Salvar receita ── */}
          <TouchableOpacity
            style={[styles.saveRecipeBtn, saving && styles.disabledBtn]}
            onPress={handleSave}
          >
            <Feather name="download" size={18} color="#fff" />
            <Text style={styles.saveRecipeBtnText}>
              {saving ? 'Salvando…' : 'Salvar receita'}
            </Text>
          </TouchableOpacity>

          {/* ─────────────── SEÇÃO DE AVALIAÇÕES ─────────────── */}
          <View style={styles.ratingsSection}>
            <Text style={styles.sectionTitle}>Avaliações</Text>

            {/* RatingSummary */}
            {recipe.ratingCount > 0 ? (
              <RatingSummary
                average={recipe.averageRating}
                total={recipe.ratingCount}
                distribution={distribution.current}
              />
            ) : (
              <View style={styles.noRatings}>
                <Text style={styles.noRatingsText}>Ainda sem avaliações. Seja o primeiro!</Text>
              </View>
            )}

            {/* Botão avaliar / editar */}
            <TouchableOpacity
              style={[styles.rateBtn, userRating ? styles.rateBtnEditing : null]}
              onPress={() => setShowModal(true)}
            >
              {userRating ? (
                <>
                  <StarRating value={userRating.stars} readonly size="sm" />
                  <Text style={[styles.rateBtnText, styles.rateBtnEditingText]}>Sua avaliação · Editar</Text>
                  <Feather name="edit-2" size={14} color={colors.primary} />
                </>
              ) : (
                <>
                  <Feather name="star" size={16} color="#fff" />
                  <Text style={styles.rateBtnText}>Avaliar esta receita</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Separador antes da lista de cards */}
          {ratings.length > 0 && <View style={styles.ratingsDivider} />}
        </View>
      </View>
    );
  }, [recipe, activeTab, saving, userRating, ratings.length]);

  // ── Rodapé da FlatList ─────────────────────────────────────────────────────
  const ListFooter = useMemo(() => {
    if (!ratingsCursor && !ratingsLoading) return <View style={{ height: 120 }} />;
    return (
      <View style={styles.listFooter}>
        {ratingsLoading && <ActivityIndicator size="small" color={colors.primary} />}
      </View>
    );
  }, [ratingsCursor, ratingsLoading]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!recipe) {
    return (
      <View style={styles.center}>
        <Text>Receita não encontrada.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={ratings}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.ratingCardWrapper}>
            <RatingCard rating={item} />
          </View>
        )}
        ListHeaderComponent={<ListHeader />}
        ListFooterComponent={ListFooter}
        onEndReached={fetchNextRatings}
        onEndReachedThreshold={0.4}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        showsVerticalScrollIndicator={false}
      />

      {/* ── FAB Iniciar Preparo ── */}
      <View style={styles.fabContainer}>
        <TouchableOpacity
          style={styles.fabBtn}
          onPress={() => navigation.navigate('CookingMode', { recipe })}
        >
          <Feather name="play" size={20} color="#fff" />
          <Text style={styles.fabText}>Iniciar Preparo</Text>
        </TouchableOpacity>
      </View>

      {/* ── Toast ── */}
      <Toast message="Avaliação publicada!" visible={toast} />

      {/* ── Modal de avaliação ── */}
      <RateRecipeModal
        visible={showModal}
        recipeId={recipeId}
        existingRating={userRating}
        onClose={() => setShowModal(false)}
        onSubmitted={handleRatingSubmitted}
      />
    </View>
  );
};

const getStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // ── Imagem ──
  imageContainer: { width: '100%', height: 280, position: 'relative' },
  image: { width: '100%', height: '100%', resizeMode: 'cover' },
  imagePlaceholder: {
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
  },
  headerBtn: {
    width: 40,
    height: 40,
    backgroundColor: colors.card + 'ED',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    marginTop: theme.spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },

  // ── Conteúdo ──
  content: {
    padding: theme.spacing.lg,
    marginTop: -20,
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  authorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    backgroundColor: colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  authorInfo: { flex: 1 },
  authorLabel: { fontSize: 12, color: colors.textSecondary },
  authorName: { fontSize: 16, fontWeight: 'bold', color: colors.text },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.round,
    marginBottom: theme.spacing.sm,
  },
  badgeText: { color: colors.textSecondary, fontWeight: 'bold', fontSize: 12 },
  title: { fontSize: 26, fontWeight: 'bold', color: colors.text, marginBottom: theme.spacing.sm },
  description: { fontSize: 15, color: colors.textSecondary, lineHeight: 22, marginBottom: theme.spacing.md },
  metaRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  metaItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, justifyContent: 'center' },
  metaDivider: { width: 1, backgroundColor: colors.border },
  metaLabel: { fontSize: 11, color: colors.textSecondary },
  metaValue: { fontSize: 15, fontWeight: 'bold', color: colors.text },

  // ── Tabs ──
  tabsContainer: { flexDirection: 'row', borderBottomWidth: 1, borderColor: colors.border, marginBottom: theme.spacing.lg },
  tab: { flex: 1, paddingVertical: theme.spacing.md, alignItems: 'center' },
  activeTab: { borderBottomWidth: 2, borderColor: colors.primary },
  tabText: { fontSize: 15, color: colors.textSecondary, fontWeight: '500' },
  activeTabText: { color: colors.primary, fontWeight: 'bold' },
  tabContent: { paddingBottom: theme.spacing.lg },

  // ── Ingredientes / Passos ──
  ingredientRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: theme.spacing.sm },
  bullet: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginRight: theme.spacing.sm },
  ingredientText: { fontSize: 15, color: colors.text, flex: 1, lineHeight: 22 },
  bold: { fontWeight: 'bold' },
  stepRow: { flexDirection: 'row', marginBottom: theme.spacing.lg },
  stepBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', marginRight: theme.spacing.md, marginTop: 2 },
  stepNum: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  stepContent: { flex: 1 },
  stepText: { fontSize: 15, color: colors.text, lineHeight: 22 },
  timerBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: colors.surface, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, marginTop: theme.spacing.sm, gap: 4 },
  timerText: { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },

  // ── Botão Salvar ──
  saveRecipeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.spacing.sm,
    backgroundColor: colors.success, padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md, marginTop: theme.spacing.lg,
  },
  saveRecipeBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  disabledBtn: { opacity: 0.6 },

  // ── Seção de avaliações ──
  ratingsSection: { marginTop: theme.spacing.xl, gap: theme.spacing.md },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text },
  noRatings: {
    backgroundColor: colors.surface, borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg, alignItems: 'center',
  },
  noRatingsText: { color: colors.textSecondary, fontSize: 14 },
  rateBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: theme.spacing.sm, backgroundColor: colors.primary,
    padding: theme.spacing.md, borderRadius: theme.borderRadius.md,
  },
  rateBtnEditing: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  rateBtnText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  rateBtnEditingText: { color: colors.primary },
  ratingsDivider: { height: 1, backgroundColor: colors.border, marginTop: theme.spacing.md },
  ratingCardWrapper: { paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.sm },

  // ── Footer / FAB ──
  listFooter: { paddingVertical: theme.spacing.lg, alignItems: 'center' },
  fabContainer: { position: 'absolute', bottom: theme.spacing.lg, left: theme.spacing.lg, right: theme.spacing.lg },
  fabBtn: {
    backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.round, elevation: 4, gap: theme.spacing.sm,
  },
  fabText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});
