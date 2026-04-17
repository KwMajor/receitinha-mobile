import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { getRecipeById, deleteRecipe } from '../../services/sqlite/recipeService';
import { theme } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { formatTime, formatQuantity, formatUnit } from '../../utils/formatters';
import { Recipe } from '../../types';
import { FavoriteButton } from '../../components/common/FavoriteButton';
import { AddToCollectionModal } from '../../components/recipe/AddToCollectionModal';
import { ServingsControl } from '../../components/recipe/ServingsControl';
import { useServings } from '../../hooks/useServings';
import { NutritionCard } from '../../components/recipe/NutritionCard';
import { calculateRecipeNutrition, NutritionInfo } from '../../services/nutritionService';
import { publishRecipe, unpublishRecipe } from '../../services/api/communityService';
import { SubstitutionBadge } from '../../components/recipe/SubstitutionBadge';
import { SubstitutionModal } from '../../components/recipe/SubstitutionModal';
import { getSubstitutionsForRecipe, SubstitutionEntry } from '../../services/substitutionService';
import { VideoPlayer } from '../../components/recipe/VideoPlayer';

export const RecipeDetailScreen = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const { recipeId } = route.params;
  const insets = useSafeAreaInsets();

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ingredients' | 'steps'>('ingredients');
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [nutrition, setNutrition] = useState<NutritionInfo | null>(null);
  const [nutritionLoading, setNutritionLoading] = useState(false);
  const [subModalEntry, setSubModalEntry] = useState<SubstitutionEntry | null>(null);

  const substitutionMap = useMemo(
    () => recipe?.ingredients?.length ? getSubstitutionsForRecipe(recipe.ingredients) : new Map<string, SubstitutionEntry>(),
    [recipe?.ingredients],
  );

  // Utilize the servings hook
  const { currentServings, setServings, adjustedIngredients } = useServings(
    recipe?.ingredients || [], 
    recipe?.servings || 1
  );

  useFocusEffect(
    useCallback(() => {
      loadRecipe();
    }, [recipeId])
  );

  useEffect(() => {
    if (!adjustedIngredients.length) return;
    setNutritionLoading(true);
    const result = calculateRecipeNutrition(adjustedIngredients, currentServings);
    setNutrition(result);
    setNutritionLoading(false);
  }, [adjustedIngredients, currentServings]);

  const loadRecipe = async () => {
    try {
      const data = await getRecipeById(recipeId);
      setRecipe(data);
    } catch (error) {
      Alert.alert('Erro ao carregar', 'Não foi possível carregar os detalhes da receita. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = () => {
    Alert.alert('Excluir Receita', 'Tem certeza que deseja excluir esta receita?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: handleDelete }
    ]);
  };

  const handleDelete = async () => {
    try {
      await deleteRecipe(recipeId);
      navigation.goBack();
    } catch (error) {
      Alert.alert('Erro ao excluir', 'Não foi possível excluir a receita. Tente novamente.');
    }
  };

  const handlePublishToggle = () => {
    const isPublic = recipe?.is_public === 1;
    if (isPublic) {
      Alert.alert(
        'Tornar privada',
        'A receita será removida da comunidade. Deseja continuar?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Tornar privada',
            style: 'destructive',
            onPress: async () => {
              try {
                await unpublishRecipe(recipeId);
                await loadRecipe();
              } catch {
                Alert.alert('Erro', 'Não foi possível despublicar a receita.');
              }
            },
          },
        ],
      );
    } else {
      Alert.alert(
        'Compartilhar com a comunidade',
        'Sua receita ficará visível para todos os usuários. Deseja publicar?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Publicar',
            onPress: async () => {
              try {
                await publishRecipe(recipeId);
                await loadRecipe();
              } catch {
                Alert.alert('Erro', 'Não foi possível publicar a receita.');
              }
            },
          },
        ],
      );
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  if (!recipe) {
    return <View style={styles.center}><Text>Receita não encontrada.</Text></View>;
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.imageContainer}>
          {recipe.photoUrl ? (
             <Image source={{ uri: recipe.photoUrl }} style={styles.image} />
          ) : (
             <View style={[styles.image, styles.placeholderImage]}>
               <Feather name="image" size={48} color={colors.textSecondary} />
             </View>
          )}
          
          <View style={[styles.headerActions, { top: insets.top + 8 }]}>
             <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()} accessibilityLabel="Voltar" accessibilityRole="button">
               <Feather name="arrow-left" size={24} color={colors.text} />
             </TouchableOpacity>
             <View style={styles.headerRight}>
               <View style={styles.headerBtn}>
                 <FavoriteButton recipeId={recipeId} />
               </View>
               <TouchableOpacity style={styles.headerBtn} onPress={() => setShowCollectionModal(true)} accessibilityLabel="Adicionar à coleção" accessibilityRole="button">
                 <Feather name="folder-plus" size={24} color={colors.text} />
               </TouchableOpacity>
               <TouchableOpacity style={styles.headerBtn} onPress={handlePublishToggle} accessibilityLabel={recipe.is_public === 1 ? 'Tornar receita privada' : 'Publicar receita'} accessibilityRole="button">
                 <Feather
                   name="globe"
                   size={24}
                   color={recipe.is_public === 1 ? colors.success : colors.text}
                 />
               </TouchableOpacity>
               <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.navigate('EditRecipe', { id: recipeId })} accessibilityLabel="Editar receita" accessibilityRole="button">
                 <Feather name="edit-2" size={24} color={colors.primary} />
               </TouchableOpacity>
               <TouchableOpacity style={styles.headerBtn} onPress={confirmDelete} accessibilityLabel="Excluir receita" accessibilityRole="button">
                 <Feather name="trash-2" size={24} color={colors.error} />
               </TouchableOpacity>
             </View>
          </View>
        </View>

        <AddToCollectionModal 
          visible={showCollectionModal} 
          recipeId={recipeId} 
          onClose={() => setShowCollectionModal(false)} 
        />

        <View style={styles.content}>
          <View style={styles.badgeRow}>
            <View style={styles.badge}><Text style={styles.badgeText}>{recipe.category}</Text></View>
            {recipe.is_public === 1 && (
              <View style={styles.publicBadge}>
                <Feather name="globe" size={11} color={colors.success} />
                <Text style={styles.publicBadgeText}>Publicada</Text>
              </View>
            )}
          </View>
          <Text style={styles.title}>{recipe.title}</Text>
          {recipe.description ? <Text style={styles.description}>{recipe.description}</Text> : null}

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Feather name="clock" size={20} color={colors.primary} />
              <View>
                <Text style={styles.metaLabel}>Tempo</Text>
                <Text style={styles.metaValue}>{formatTime(recipe.prepTime)}</Text>
              </View>
            </View>
            <View style={styles.metaDivider} />
            <View style={styles.metaItem}>
              <Feather name="book-open" size={20} color={colors.primary} />
              <View>
                <Text style={styles.metaLabel}>Receita Original</Text>
                <Text style={styles.metaValue}>{recipe.servings} {recipe.servings === 1 ? 'porção' : 'porções'}</Text>
              </View>
            </View>
          </View>

          <View style={{ paddingHorizontal: theme.spacing.md, marginTop: theme.spacing.md }}>
            <ServingsControl 
              servings={currentServings}
              onIncrease={() => setServings((prev: number) => prev + 1)}
              onDecrease={() => setServings((prev: number) => prev - 1)}
            />
          </View>

          {recipe.videoUrl ? (
            <VideoPlayer uri={recipe.videoUrl} />
          ) : null}

          <View style={styles.tabsContainer} accessibilityRole="tablist">
             <TouchableOpacity
               style={[styles.tab, activeTab === 'ingredients' && styles.activeTab]}
               onPress={() => setActiveTab('ingredients')}
               accessibilityRole="tab"
               accessibilityState={{ selected: activeTab === 'ingredients' }}
             >
               <Text style={[styles.tabText, activeTab === 'ingredients' && styles.activeTabText]}>Ingredientes</Text>
             </TouchableOpacity>
             <TouchableOpacity
               style={[styles.tab, activeTab === 'steps' && styles.activeTab]}
               onPress={() => setActiveTab('steps')}
               accessibilityRole="tab"
               accessibilityState={{ selected: activeTab === 'steps' }}
             >
               <Text style={[styles.tabText, activeTab === 'steps' && styles.activeTabText]}>Modo de Preparo</Text>
             </TouchableOpacity>
          </View>

          <View style={styles.tabContent}>
            {activeTab === 'ingredients' ? (
              adjustedIngredients.map((ing) => {
                const subEntry = substitutionMap.get(ing.name);
                return (
                  <View key={ing.id} style={styles.ingredientRow}>
                    <View style={styles.bullet} />
                    <Text style={styles.ingredientText}>
                      <Text style={[styles.boldText, (ing as any).isAdjusted && { color: colors.primary }]}>
                        {formatQuantity(ing.quantity)} {formatUnit(ing.quantity, ing.unit)}
                      </Text>
                      {' '}de {ing.name}
                    </Text>
                    {subEntry && (
                      <SubstitutionBadge
                        ingredientName={ing.name}
                        onPress={() => setSubModalEntry(subEntry)}
                      />
                    )}
                  </View>
                );
              })
            ) : (
              <View>
                {recipe.steps.length > 0 && (
                  <TouchableOpacity 
                    style={{ backgroundColor: colors.primary, padding: 15, borderRadius: 8, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 20 }}
                    onPress={() => navigation.navigate('CookingMode', { recipe })}
                  >
                    <Feather name="play" size={20} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>Iniciar Modo de Preparo</Text>
                  </TouchableOpacity>
                )}
                {recipe.steps.map((step, i) => (
                  <View key={step.id} style={styles.stepRow}>
                    <View style={styles.stepBadge}><Text style={styles.stepBadgeText}>{i + 1}</Text></View>
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
                ))}
              </View>
            )}
          </View>

          {/* Nutritional information */}
          <View style={styles.nutritionSection}>
            <NutritionCard nutrition={nutrition} isLoading={nutritionLoading} />
          </View>

        </View>
      </ScrollView>

      {/* Modal único de substituições — um só por tela, não um por ingrediente */}
      <SubstitutionModal
        visible={subModalEntry !== null}
        entry={subModalEntry}
        ingredientName={subModalEntry?.original ?? ''}
        onClose={() => setSubModalEntry(null)}
      />

      {/* Botão Flutuante Iniciar Preparo */}
      <View style={styles.fabContainer}>
         <TouchableOpacity style={styles.fabBtn} onPress={() => navigation.navigate('CookingMode', { recipe })}>
            <Feather name="play" size={20} color="#fff" />
            <Text style={styles.fabText}>Iniciar Preparo</Text>
         </TouchableOpacity>
      </View>
    </View>
  );
};

const getStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  imageContainer: { width: '100%', height: 300, position: 'relative' },
  image: { width: '100%', height: '100%', resizeMode: 'cover' },
  placeholderImage: { backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center' },
  headerActions: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between' },
  headerRight: { flexDirection: 'row', gap: 12 },
  headerBtn: { width: 40, height: 40, backgroundColor: colors.card + 'ED', borderRadius: 20, justifyContent: 'center', alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.15, shadowRadius: 2 },
  content: { padding: theme.spacing.lg, marginTop: -24, backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginBottom: theme.spacing.sm },
  badge: { alignSelf: 'flex-start', backgroundColor: colors.surface, paddingHorizontal: 12, paddingVertical: 6, borderRadius: theme.borderRadius.round },
  badgeText: { color: colors.textSecondary, fontWeight: 'bold', fontSize: 12 },
  publicBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#E8F8EF', paddingHorizontal: 10, paddingVertical: 5, borderRadius: theme.borderRadius.round },
  publicBadgeText: { color: colors.success, fontWeight: 'bold', fontSize: 12 },
  title: { fontSize: 28, fontWeight: 'bold', color: colors.text, marginBottom: theme.spacing.md },
  description: { fontSize: 16, color: colors.textSecondary, lineHeight: 24, marginBottom: theme.spacing.lg },
  metaRow: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: theme.borderRadius.lg, padding: theme.spacing.md, marginBottom: theme.spacing.xl },
  metaItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, justifyContent: 'center' },
  metaDivider: { width: 1, backgroundColor: colors.border },
  metaLabel: { fontSize: 12, color: colors.textSecondary },
  metaValue: { fontSize: 16, fontWeight: 'bold', color: colors.text },
  tabsContainer: { flexDirection: 'row', borderBottomWidth: 1, borderColor: colors.border, marginBottom: theme.spacing.lg },
  tab: { flex: 1, paddingVertical: theme.spacing.md, alignItems: 'center' },
  activeTab: { borderBottomWidth: 2, borderColor: colors.primary },
  tabText: { fontSize: 16, color: colors.textSecondary, fontWeight: '500' },
  activeTabText: { color: colors.primary, fontWeight: 'bold' },
  tabContent: { paddingBottom: 100 },
  ingredientRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: theme.spacing.sm, paddingHorizontal: theme.spacing.xs },
  bullet: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginRight: theme.spacing.sm },
  ingredientText: { fontSize: 16, color: colors.text, flex: 1, lineHeight: 24 },
  boldText: { fontWeight: 'bold' },
  stepRow: { flexDirection: 'row', marginBottom: theme.spacing.lg },
  stepBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', marginRight: theme.spacing.md, marginTop: 2 },
  stepBadgeText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  stepContent: { flex: 1 },
  stepText: { fontSize: 16, color: colors.text, lineHeight: 24 },
  timerBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: colors.surface, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, marginTop: theme.spacing.sm, gap: 4 },
  timerText: { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },
  fabContainer: { position: 'absolute', bottom: theme.spacing.lg, left: theme.spacing.lg, right: theme.spacing.lg },
  fabBtn: { backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: theme.spacing.lg, borderRadius: theme.borderRadius.round, elevation: 4, gap: theme.spacing.sm },
  fabText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  nutritionSection: {
    marginTop: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingBottom: 120,
  },
});