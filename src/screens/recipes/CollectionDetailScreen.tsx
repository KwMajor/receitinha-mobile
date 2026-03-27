import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Alert, TouchableOpacity, Modal } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { getCollectionRecipes, removeFromCollection, deleteCollection, addToCollection } from '../../services/sqlite/favoriteService';
import { getRecipes } from '../../services/sqlite/recipeService';
import { useAuthStore } from '../../store/authStore';
import { Recipe } from '../../types';
import { RecipeCard } from '../../components/recipe/RecipeCard';

export const CollectionDetailScreen = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { collectionId, collectionName } = route.params;
  const { user } = useAuthStore();

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [allRecipes, setAllRecipes] = useState<Recipe[]>([]);
  const [loadingAll, setLoadingAll] = useState(false);

  useEffect(() => {
    navigation.setOptions({
      title: collectionName,
      headerRight: () => (
        <TouchableOpacity onPress={confirmDeleteCollection} style={{ marginRight: 15 }}>
          <Feather name="trash-2" size={20} color={theme.colors.error} />
        </TouchableOpacity>
      )
    });
    loadRecipes();
  }, [collectionId]);

  const loadRecipes = async () => {
    try {
      const data = await getCollectionRecipes(collectionId);
      setRecipes(data);
    } catch (error) {
      Alert.alert('Erro ao carregar', 'Não foi possível carregar as receitas desta coleção. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = async () => {
    if (!user) return;
    setAddModalVisible(true);
    setLoadingAll(true);
    try {
      const all = await getRecipes(user.id);
      const collectionIds = new Set(recipes.map(r => r.id));
      setAllRecipes(all.filter(r => !collectionIds.has(r.id)));
    } catch (error) {
      Alert.alert('Erro ao carregar', 'Não foi possível carregar suas receitas. Tente novamente.');
    } finally {
      setLoadingAll(false);
    }
  };

  const handleAddRecipe = async (recipe: Recipe) => {
    try {
      await addToCollection(collectionId, recipe.id);
      setRecipes(prev => [...prev, recipe]);
      setAllRecipes(prev => prev.filter(r => r.id !== recipe.id));
    } catch (error) {
      Alert.alert('Erro ao adicionar', 'Não foi possível adicionar a receita à coleção. Tente novamente.');
    }
  };

  const confirmDeleteCollection = () => {
    Alert.alert('Excluir Coleção', 'Tem certeza que deseja excluir esta coleção?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: handleDeleteCollection }
    ]);
  };

  const handleDeleteCollection = async () => {
    try {
      await deleteCollection(collectionId);
      navigation.goBack();
    } catch (error) {
      Alert.alert('Erro ao excluir', 'Não foi possível excluir a coleção. Tente novamente.');
    }
  };

  const handleRemoveRecipe = (recipeId: string, recipeTitle: string) => {
    Alert.alert('Remover Receita', `Deseja remover "${recipeTitle}" desta coleção?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          try {
            await removeFromCollection(collectionId, recipeId);
            setRecipes(prev => prev.filter(r => r.id !== recipeId));
          } catch (error) {
            Alert.alert('Erro ao remover', 'Não foi possível remover a receita da coleção. Tente novamente.');
          }
        }
      }
    ]);
  };

  const renderItem = ({ item }: { item: Recipe }) => (
    <View style={styles.recipeContainer}>
      <View style={{ flex: 1 }}>
        <RecipeCard
          recipe={item}
          onPress={() => navigation.navigate('RecipeDetail', { recipeId: item.id })}
        />
      </View>
      <TouchableOpacity
        style={styles.removeBtn}
        onPress={() => handleRemoveRecipe(item.id, item.title)}
      >
        <Feather name="x-circle" size={24} color={theme.colors.error} />
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {recipes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Feather name="folder" size={48} color={theme.colors.textSecondary} />
          <Text style={styles.emptyText}>Coleção vazia</Text>
        </View>
      ) : (
        <FlatList
          data={recipes}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={openAddModal}>
        <Feather name="plus" size={24} color="#fff" />
        <Text style={styles.fabText}>Adicionar Receita</Text>
      </TouchableOpacity>

      <Modal visible={addModalVisible} animationType="slide" transparent>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setAddModalVisible(false)}>
          <TouchableOpacity style={styles.modalContent} activeOpacity={1} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Adicionar Receita</Text>
              <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                <Feather name="x" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            {loadingAll ? (
              <ActivityIndicator style={{ marginTop: 40 }} color={theme.colors.primary} />
            ) : allRecipes.length === 0 ? (
              <View style={styles.emptyModal}>
                <Feather name="check-circle" size={48} color={theme.colors.textSecondary} />
                <Text style={styles.emptyText}>Todas as receitas já estão na coleção</Text>
              </View>
            ) : (
              <FlatList
                data={allRecipes}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ padding: theme.spacing.md }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.recipeOption}
                    onPress={() => handleAddRecipe(item)}
                  >
                    <Text style={styles.recipeOptionText}>{item.title}</Text>
                    <Feather name="plus-circle" size={22} color={theme.colors.primary} />
                  </TouchableOpacity>
                )}
              />
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background },
  list: { padding: theme.spacing.md, paddingBottom: 100 },
  recipeContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.md },
  removeBtn: { padding: theme.spacing.sm, marginLeft: theme.spacing.xs },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { marginTop: theme.spacing.md, fontSize: 16, color: theme.colors.textSecondary, textAlign: 'center' },
  fab: { position: 'absolute', bottom: theme.spacing.lg, right: theme.spacing.lg, flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.primary, paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md, borderRadius: theme.borderRadius.round, elevation: 4 },
  fabText: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginLeft: theme.spacing.sm },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: theme.colors.background, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: theme.spacing.lg, borderBottomWidth: 1, borderColor: theme.colors.border },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text },
  emptyModal: { alignItems: 'center', padding: theme.spacing.xl },
  recipeOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: theme.spacing.md, borderBottomWidth: 1, borderColor: theme.colors.border },
  recipeOptionText: { fontSize: 16, color: theme.colors.text, flex: 1, marginRight: theme.spacing.sm },
});
