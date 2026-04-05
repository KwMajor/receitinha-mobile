import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, FlatList, TextInput, Alert, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { getCollections, createCollection, addToCollection, removeFromCollection, getCollectionRecipes } from '../../services/sqlite/favoriteService';
import { useAuthStore } from '../../store/authStore';
import { Collection } from '../../types';

interface AddToCollectionModalProps {
  visible: boolean;
  recipeId: string;
  onClose: () => void;
}

export const AddToCollectionModal = ({ visible, recipeId, onClose }: AddToCollectionModalProps) => {
  const { user } = useAuthStore();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [recipeCollections, setRecipeCollections] = useState<string[]>([]);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (visible && user) {
      loadCollections();
    }
  }, [visible, user]);

  const loadCollections = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const cols = await getCollections(user.id);
      setCollections(cols);
      // Determine which collections have this recipe
      const recipeColIds: string[] = [];
      for (const col of cols) {
         const recipes = await getCollectionRecipes(col.id, user.id);
         if (recipes.some(r => r.id === recipeId)) {
            recipeColIds.push(col.id);
         }
      }
      setRecipeCollections(recipeColIds);
    } catch (error) {
      Alert.alert('Erro ao carregar', 'Não foi possível carregar as coleções. Tente novamente.');
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
    } catch (error) {
      Alert.alert('Erro ao criar', 'Não foi possível criar a coleção. Tente novamente.');
    }
  };

  const toggleCollection = async (collectionId: string) => {
    if (!user) return;
    setUpdating(true);
    try {
      const isIncluded = recipeCollections.includes(collectionId);
      if (isIncluded) {
        await removeFromCollection(collectionId, recipeId, user.id);
        setRecipeCollections(prev => prev.filter(id => id !== collectionId));
      } else {
        await addToCollection(collectionId, recipeId, user.id);
        setRecipeCollections(prev => [...prev, collectionId]);
      }
    } catch (error) {
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
              <Feather name="x" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          {isCreating ? (
            <View style={styles.createContainer}>
              <TextInput
                style={styles.input}
                placeholder="Nome da coleção"
                value={newCollectionName}
                onChangeText={setNewCollectionName}
                autoFocus
                placeholderTextColor={theme.colors.textSecondary}
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
               <Feather name="plus" size={20} color={theme.colors.primary} />
               <Text style={styles.newBtnText}>Nova Coleção</Text>
             </TouchableOpacity>
          )}

          {loading ? (
             <ActivityIndicator style={{ marginTop: 20 }} color={theme.colors.primary} />
          ) : (
            <FlatList
              data={collections}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.list}
              renderItem={({ item }) => {
                const isSelected = recipeCollections.includes(item.id);
                return (
                  <TouchableOpacity 
                    style={styles.collectionItem}
                    onPress={() => toggleCollection(item.id)}
                    disabled={updating}
                  >
                    <Feather name={isSelected ? "check-square" : "square"} size={22} color={isSelected ? theme.colors.primary : theme.colors.textSecondary} />
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

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: theme.spacing.md,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  closeBtn: {
    padding: theme.spacing.xs,
  },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  newBtnText: {
    marginLeft: theme.spacing.sm,
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: '500',
  },
  createContainer: {
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.sm,
    fontSize: 16,
    marginBottom: theme.spacing.sm,
  },
  createActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: theme.spacing.sm,
  },
  cancelBtn: {
    padding: theme.spacing.sm,
  },
  cancelBtnText: {
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  saveBtn: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  list: {
    paddingBottom: theme.spacing.xl,
  },
  collectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  collectionName: {
    fontSize: 16,
    marginLeft: theme.spacing.sm,
    color: theme.colors.text,
  },
  selectedName: {
    fontWeight: '500',
  }
});
