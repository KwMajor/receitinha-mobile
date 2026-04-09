import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Alert, Modal, TextInput, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { useAuthStore } from '../../store/authStore';
import { theme } from '../../constants/theme';
import { ShoppingList } from '../../types';
import {
  getLists, createList, renameList, duplicateList,
  deleteList, setActiveList,
} from '../../services/sqlite/shoppingService';

export const ShoppingListsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal state (shared for create + rename)
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const loadLists = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const data = await getLists(user.id);
      setLists(data);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useFocusEffect(useCallback(() => { loadLists(); }, [loadLists]));

  // ── Modal helpers ──────────────────────────────────────────────────────────

  const openCreateModal = () => {
    setModalTitle('Nova lista');
    setInputValue('');
    setEditingId(null);
    setModalVisible(true);
  };

  const openRenameModal = (list: ShoppingList) => {
    setModalTitle('Renomear lista');
    setInputValue(list.name);
    setEditingId(list.id);
    setModalVisible(true);
  };

  const handleModalConfirm = async () => {
    const name = inputValue.trim();
    if (!name || !user) return;
    setModalVisible(false);

    if (editingId) {
      await renameList(editingId, name);
    } else {
      await createList(user.id, name);
    }
    loadLists();
  };

  // ── List actions ────────────────────────────────────────────────────────────

  const handleDelete = (list: ShoppingList) => {
    Alert.alert(
      'Excluir lista',
      `Deseja excluir "${list.name}"? Esta ação não pode ser desfeita.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            await deleteList(list.id);
            setLists((prev) => prev.filter((l) => l.id !== list.id));
          },
        },
      ]
    );
  };

  const handleLongPress = (list: ShoppingList) => {
    Alert.alert(list.name, undefined, [
      {
        text: 'Duplicar',
        onPress: async () => {
          const newId = await duplicateList(list.id, `${list.name} (cópia)`);
          loadLists();
          navigation.navigate('ShoppingListDetail', { listId: newId });
        },
      },
      {
        text: 'Definir como ativa',
        onPress: async () => {
          if (!user) return;
          await setActiveList(user.id, list.id);
          loadLists();
        },
      },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  // ── Swipe actions ───────────────────────────────────────────────────────────

  const renderLeftActions = (list: ShoppingList) => (
    <TouchableOpacity style={styles.renameAction} onPress={() => openRenameModal(list)}>
      <Feather name="edit-2" size={20} color="#fff" />
      <Text style={styles.actionLabel}>Renomear</Text>
    </TouchableOpacity>
  );

  const renderRightActions = (list: ShoppingList) => (
    <TouchableOpacity style={styles.deleteAction} onPress={() => handleDelete(list)}>
      <Feather name="trash-2" size={20} color="#fff" />
      <Text style={styles.actionLabel}>Excluir</Text>
    </TouchableOpacity>
  );

  // ── Render item ─────────────────────────────────────────────────────────────

  const renderItem = ({ item }: { item: ShoppingList }) => (
    <Swipeable
      renderLeftActions={() => renderLeftActions(item)}
      renderRightActions={() => renderRightActions(item)}
    >
      <TouchableOpacity
        style={styles.listCard}
        onPress={() => navigation.navigate('ShoppingListDetail', { listId: item.id })}
        onLongPress={() => handleLongPress(item)}
        activeOpacity={0.8}
      >
        <View style={styles.listIcon}>
          <Feather name="shopping-cart" size={20} color={theme.colors.primary} />
        </View>
        <View style={styles.listInfo}>
          <View style={styles.listNameRow}>
            <Text style={styles.listName} numberOfLines={1}>{item.name}</Text>
            {item.isActive && (
              <View style={styles.activeBadge}>
                <Text style={styles.activeBadgeText}>ativa</Text>
              </View>
            )}
          </View>
          <Text style={styles.listMeta}>
            {item.itemCount ?? 0} {item.itemCount === 1 ? 'item' : 'itens'}
            {(item.pendingCount ?? 0) > 0
              ? ` · ${item.pendingCount} pendente${item.pendingCount === 1 ? '' : 's'}`
              : (item.itemCount ?? 0) > 0 ? ' · tudo marcado ✓' : ''}
          </Text>
          {(item.itemCount ?? 0) > 0 && (
            <View style={styles.cardProgressTrack}>
              <View
                style={[
                  styles.cardProgressFill,
                  { width: `${Math.round((((item.itemCount ?? 0) - (item.pendingCount ?? 0)) / (item.itemCount ?? 1)) * 100)}%` },
                ]}
              />
            </View>
          )}
        </View>
        <Feather name="chevron-right" size={18} color={theme.colors.textSecondary} />
      </TouchableOpacity>
    </Swipeable>
  );

  const addBtn = (
    <TouchableOpacity style={styles.addBtn} onPress={openCreateModal} accessibilityLabel="Nova lista" accessibilityRole="button">
      <Feather name="plus" size={18} color="#fff" />
      <Text style={styles.addBtnText}>Nova lista</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScreenHeader title="Compras" right={addBtn} />

      {isLoading ? (
        <ActivityIndicator style={styles.loader} color={theme.colors.primary} size="large" />
      ) : (
        <FlatList
          data={lists}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={lists.length === 0 ? styles.emptyContainer : { paddingBottom: 32 }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Feather name="shopping-cart" size={48} color={theme.colors.border} />
              <Text style={styles.emptyTitle}>Nenhuma lista ainda</Text>
              <Text style={styles.emptySubtitle}>
                Crie uma lista manualmente ou gere uma a partir do planejamento semanal.
              </Text>
            </View>
          }
        />
      )}

      {/* Create / Rename Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <TouchableOpacity style={styles.modalBox} activeOpacity={1}>
            <Text style={styles.modalTitle}>{modalTitle}</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Nome da lista"
              value={inputValue}
              onChangeText={setInputValue}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleModalConfirm}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirm, !inputValue.trim() && styles.modalConfirmDisabled]}
                onPress={handleModalConfirm}
                disabled={!inputValue.trim()}
              >
                <Text style={styles.modalConfirmText}>
                  {editingId ? 'Salvar' : 'Criar'}
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.background },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: 9,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.round,
    gap: 6,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  loader: { flex: 1, marginTop: 40 },
  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.sm,
    borderRadius: 14,
    padding: theme.spacing.md,
    gap: theme.spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
  listIcon: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: theme.colors.primary + '18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listInfo: { flex: 1, gap: 6 },
  listNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  listName: { fontSize: 15, fontWeight: '700', color: theme.colors.text, flexShrink: 1 },
  activeBadge: {
    backgroundColor: theme.colors.success + '20',
    borderRadius: theme.borderRadius.round,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  activeBadgeText: { fontSize: 11, color: theme.colors.success, fontWeight: '700' },
  listMeta: { fontSize: 12, color: theme.colors.textSecondary },
  cardProgressTrack: {
    height: 4,
    backgroundColor: theme.colors.border,
    borderRadius: 2,
  },
  cardProgressFill: {
    height: 4,
    backgroundColor: theme.colors.success,
    borderRadius: 2,
  },
  renameAction: {
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
    gap: 4,
    marginTop: theme.spacing.sm,
    marginLeft: theme.spacing.md,
  },
  deleteAction: {
    backgroundColor: theme.colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    borderTopRightRadius: 14,
    borderBottomRightRadius: 14,
    gap: 4,
    marginTop: theme.spacing.sm,
    marginRight: theme.spacing.md,
  },
  actionLabel: { color: '#fff', fontSize: 11, fontWeight: '600' },
  emptyContainer: { flex: 1, justifyContent: 'center' },
  emptyState: { alignItems: 'center', padding: theme.spacing.xl, gap: theme.spacing.md },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.text },
  emptySubtitle: {
    fontSize: 14, color: theme.colors.textSecondary,
    textAlign: 'center', lineHeight: 20,
  },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center', alignItems: 'center',
  },
  modalBox: {
    width: '85%', backgroundColor: '#fff',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg, gap: theme.spacing.md,
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.text },
  modalInput: {
    borderWidth: 1, borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: 15, color: theme.colors.text,
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: theme.spacing.sm },
  modalCancel: {
    paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm,
  },
  modalCancelText: { fontSize: 15, color: theme.colors.textSecondary },
  modalConfirm: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  modalConfirmDisabled: { backgroundColor: theme.colors.border },
  modalConfirmText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
