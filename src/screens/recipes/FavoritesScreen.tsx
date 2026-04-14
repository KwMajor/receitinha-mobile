import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Modal, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { getFavorites, getCollections, createCollection, deleteCollection } from '../../services/sqlite/favoriteService';
import { RecipeCard } from '../../components/recipe/RecipeCard';
import { theme } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { Recipe, Collection } from '../../types';
import { ScreenHeader } from '../../components/common/ScreenHeader';

const getStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  tabsContainer: { flexDirection: 'row', borderBottomWidth: 1, borderColor: colors.border },
  tab: { flex: 1, paddingVertical: theme.spacing.md, alignItems: 'center' },
  activeTab: { borderBottomWidth: 2, borderColor: colors.primary },
  tabText: { fontSize: 16, color: colors.textSecondary, fontWeight: '500' },
  activeTabText: { color: colors.primary, fontWeight: 'bold' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: theme.spacing.md, paddingBottom: 100 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 100 },
  emptyText: { fontSize: 16, color: colors.textSecondary, marginTop: theme.spacing.md },

  collectionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, padding: theme.spacing.md, borderRadius: theme.borderRadius.md, marginBottom: theme.spacing.md, borderWidth: 1, borderColor: colors.border },
  collectionIcon: { width: 56, height: 56, backgroundColor: colors.surface, borderRadius: theme.borderRadius.md, justifyContent: 'center', alignItems: 'center', marginRight: theme.spacing.md },
  collectionInfo: { flex: 1 },
  collectionName: { fontSize: 18, fontWeight: 'bold', color: colors.text },
  collectionCount: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },

  fabBtn: { position: 'absolute', bottom: theme.spacing.lg, right: theme.spacing.lg, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md, borderRadius: theme.borderRadius.round, elevation: 4 },
  fabText: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginLeft: theme.spacing.sm },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: theme.spacing.lg },
  modalContent: { backgroundColor: colors.background, borderRadius: theme.borderRadius.md, padding: theme.spacing.lg },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: theme.spacing.lg, color: colors.text, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, fontSize: 16, marginBottom: theme.spacing.lg, color: colors.text },
  modalActions: { flexDirection: 'row', gap: theme.spacing.md },
  modalBtn: { flex: 1, paddingVertical: theme.spacing.md, alignItems: 'center', borderRadius: theme.borderRadius.md, backgroundColor: colors.surface },
  modalBtnPrimary: { backgroundColor: colors.primary },
  modalBtnTextCancel: { color: colors.text, fontWeight: 'bold' },
  modalBtnTextPrimary: { color: '#fff', fontWeight: 'bold' },
});

export const FavoritesScreen = () => {
  const { user } = useAuthStore();
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const [activeTab, setActiveTab] = useState<'favorites' | 'collections'>('favorites');
  const [favorites, setFavorites] = useState<Recipe[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalVisible, setModalVisible] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');

  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [activeTab])
  );

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      if (activeTab === 'favorites') {
        const favs = await getFavorites(user.id);
        setFavorites(Array.isArray(favs) ? favs : []);
      } else {
        const cols = await getCollections(user.id);
        setCollections(Array.isArray(cols) ? cols : []);
      }
    } catch {
      // silencia
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCollection = async () => {
    if (!newCollectionName.trim() || !user) return;
    try {
      await createCollection(user.id, newCollectionName);
      setNewCollectionName('');
      setModalVisible(false);
      loadData();
    } catch (e) {
      Alert.alert('Erro ao criar', 'Não foi possível criar a coleção. Tente novamente.');
    }
  };

  const confirmDeleteCollection = (item: Collection) => {
    const count = item.recipeIds?.length ?? 0;
    const message = count > 0
      ? `Esta coleção contém ${count} ${count === 1 ? 'receita salva' : 'receitas salvas'}. Ao excluir, as receitas não serão apagadas, mas serão removidas da coleção. Deseja continuar?`
      : 'Tem certeza que deseja excluir esta coleção?';
    Alert.alert('Excluir Coleção', message, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => handleDeleteCollection(item.id) }
    ]);
  };

  const handleDeleteCollection = async (id: string) => {
    try {
      await deleteCollection(id);
      loadData();
    } catch (e) {
      Alert.alert('Erro ao excluir', 'Não foi possível excluir a coleção. Tente novamente.');
    }
  };

  const renderFavorite = ({ item }: { item: Recipe }) => (
    <RecipeCard recipe={item} onPress={() => navigation.navigate('RecipeDetail', { recipeId: item.id })} />
  );

  const renderCollection = ({ item }: { item: Collection }) => (
    <TouchableOpacity
      style={styles.collectionCard}
      onPress={() => navigation.navigate('CollectionDetail', { collectionId: item.id, collectionName: item.name })}
      onLongPress={() => confirmDeleteCollection(item)}
    >
      <View style={styles.collectionIcon}>
        <Feather name="folder" size={32} color={colors.primary} />
      </View>
      <View style={styles.collectionInfo}>
        <Text style={styles.collectionName}>{item.name}</Text>
        <Text style={styles.collectionCount}>{item.recipeIds?.length || 0} receitas</Text>
      </View>
      <Feather name="chevron-right" size={24} color={colors.textSecondary} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Salvos" />
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'favorites' && styles.activeTab]}
          onPress={() => setActiveTab('favorites')}
        >
          <Text style={[styles.tabText, activeTab === 'favorites' && styles.activeTabText]}>Favoritos</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'collections' && styles.activeTab]}
          onPress={() => setActiveTab('collections')}
        >
          <Text style={[styles.tabText, activeTab === 'collections' && styles.activeTabText]}>Coleções</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : activeTab === 'favorites' ? (
        <FlatList
          data={favorites}
          keyExtractor={(item) => item.id}
          renderItem={renderFavorite}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Feather name="heart" size={64} color={colors.border} />
              <Text style={styles.emptyText}>Sem favoritos ainda.</Text>
            </View>
          }
        />
      ) : (
        <View style={{ flex: 1 }}>
          <FlatList
            data={collections}
            keyExtractor={(item) => item.id}
            renderItem={renderCollection}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Feather name="folder" size={64} color={colors.border} />
                <Text style={styles.emptyText}>Nenhuma coleção criada.</Text>
              </View>
            }
          />
          <TouchableOpacity style={styles.fabBtn} onPress={() => setModalVisible(true)}>
            <Feather name="plus" size={24} color="#fff" />
            <Text style={styles.fabText}>Nova Coleção</Text>
          </TouchableOpacity>
        </View>
      )}

      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Nova Coleção</Text>
            <TextInput
              style={styles.input}
              placeholder="Nome da coleção"
              placeholderTextColor={colors.textSecondary}
              value={newCollectionName}
              onChangeText={setNewCollectionName}
              autoFocus
              returnKeyType="done"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.modalBtnTextCancel}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.modalBtnPrimary]} onPress={handleCreateCollection}>
                <Text style={styles.modalBtnTextPrimary}>Criar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};
