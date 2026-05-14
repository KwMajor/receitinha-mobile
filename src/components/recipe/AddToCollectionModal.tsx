import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, FlatList, TextInput, Alert, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { getCollections, createCollection, addToCollection, removeFromCollection, getCollectionRecipes } from '../../services/sqlite/favoriteService';
import { useAuthStore } from '../../store/authStore';
import { Collection } from '../../types';

interface AddToCollectionModalProps {
  visible: boolean;
  recipeId: string;
  onClose: () => void;
}

const getStyles = (colors: any) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.background, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: theme.spacing.md, maxHeight: '80%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.md },
  title: { fontSize: 18, fontWeight: 'bold', color: colors.text },
  closeBtn: { padding: theme.spacing.xs },
  newBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: theme.spacing.sm, marginBottom: theme.spacing.sm },
  newBtnText: { marginLeft: theme.spacing.sm, color: colors.primary, fontSize: 16, fontWeight: '500' },
  createContainer: { marginBottom: theme.spacing.md, backgroundColor: colors.surface, padding: theme.spacing.sm, borderRadius: theme.borderRadius.md },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: theme.borderRadius.sm, padding: theme.spacing.sm, fontSize: 16, marginBottom: theme.spacing.sm, color: colors.text },
  createActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: theme.spacing.sm },
  cancelBtn: { padding: theme.spacing.sm },
  cancelBtnText: { color: colors.textSecondary, fontWeight: '500' },
  saveBtn: { backgroundColor: colors.primary, padding: theme.spacing.sm, paddingHorizontal: theme.spacing.md, borderRadius: theme.borderRadius.sm },
  saveBtnText: { color: '#fff', fontWeight: 'bold' },
  list: { paddingBottom: theme.spacing.xl },
  collectionItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: theme.spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  collectionName: { fontSize: 16, marginLeft: theme.spacing.sm, color: colors.text },
  selectedName: { fontWeight: '500' },
});

export const AddToCollectionModal = ({ visible, recipeId, onClose }: AddToCollectionModalProps) => {
  const { user } = useAuthStore();
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [recipeCollections, setRecipeCollections] = useState<string[]>([]);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (visible && user) loadCollections();
  }, [visible, user]);

  const loadCollections = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const cols = await getCollections(user.id);
      setCollections(cols);
      const recipeColIds: string[] = [];
      for (const col of cols) {
        const recipes = await getCollectionRecipes(col.id);
        if (recipes.some(r => r.id === recipeId)) recipeColIds.push(col.id);
      }
      setRecipeCollections(recipeColIds);
    } catch {
      // silencia
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCollection = async () => {
    if (!user || !newCollectionName.trim()) return;
    try {
      await createCollection(user.id, newCollectionName.trim());
      setNewCollectionName('');
      setIsCreating(false);
      loadCollections();
    } catch {
      Alert.alert('Erro ao criar', 'Não foi possível criar a coleção. Tente novamente.');
    }
  };

  const toggleCollection = async (collectionId: string) => {
    if (!user) return;
    setUpdating(true);
    try {
      if (recipeCollections.includes(collectionId)) {
        await removeFromCollection(collectionId, recipeId);
        setRecipeCollections(prev => prev.filter(id => id !== collectionId));
      } else {
        await addToCollection(collectionId, recipeId);
        setRecipeCollections(prev => [...prev, collectionId]);
      }
    } catch {
      Alert.alert('Erro ao atualizar', 'Não foi possível atualizar a coleção. Tente novamente.');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Salvar em coleção</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {isCreating ? (
            <View style={styles.createContainer}>
              <TextInput
                style={styles.input}
                placeholder="Nome da coleção"
                placeholderTextColor={colors.textSecondary}
                value={newCollectionName}
                onChangeText={setNewCollectionName}
                autoFocus
                returnKeyType="done"
              />
              <View style={styles.createActions}>
                <TouchableOpacity onPress={() => setIsCreating(false)} style={styles.cancelBtn}>
                  <Text style={styles.cancelBtnText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleCreateCollection} style={styles.saveBtn}>
                  <Text style={styles.saveBtnText}>Criar</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity style={styles.newBtn} onPress={() => setIsCreating(true)}>
              <Feather name="plus" size={20} color={colors.primary} />
              <Text style={styles.newBtnText}>Nova Coleção</Text>
            </TouchableOpacity>
          )}

          {loading ? (
            <ActivityIndicator style={{ marginTop: 20 }} color={colors.primary} />
          ) : (
            <FlatList
              data={collections}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.list}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const isSelected = recipeCollections.includes(item.id);
                return (
                  <TouchableOpacity style={styles.collectionItem} onPress={() => toggleCollection(item.id)} disabled={updating}>
                    <Feather name={isSelected ? 'check-square' : 'square'} size={22} color={isSelected ? colors.primary : colors.textSecondary} />
                    <Text style={[styles.collectionName, isSelected && styles.selectedName]}>{item.name}</Text>
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </View>
      </View>
    </Modal>
  );
};
