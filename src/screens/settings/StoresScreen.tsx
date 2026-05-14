import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../contexts/ThemeContext';
import { theme } from '../../constants/theme';
import { ScreenHeader } from '../../components/common/ScreenHeader';

interface Store {
  id: string;
  name: string;
  address: string;
  note: string;
  addedAt: number;
}

const STORES_KEY = 'user_stores';

const loadStores = async (): Promise<Store[]> => {
  try {
    const raw = await AsyncStorage.getItem(STORES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveStores = async (stores: Store[]): Promise<void> => {
  await AsyncStorage.setItem(STORES_KEY, JSON.stringify(stores));
};

export const StoresScreen = () => {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formNote, setFormNote] = useState('');
  const [saving, setSaving] = useState(false);
  const addressRef = useRef<TextInput>(null);
  const noteRef = useRef<TextInput>(null);

  const fetchStores = useCallback(async () => {
    const data = await loadStores();
    setStores(data);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchStores();
    }, [fetchStores])
  );

  const openAdd = () => {
    setEditingId(null);
    setFormName('');
    setFormAddress('');
    setFormNote('');
    setShowForm(true);
  };

  const openEdit = (store: Store) => {
    setEditingId(store.id);
    setFormName(store.name);
    setFormAddress(store.address);
    setFormNote(store.note);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      Alert.alert('Nome obrigatório', 'Informe o nome do supermercado.');
      return;
    }
    setSaving(true);
    try {
      const current = await loadStores();
      let updated: Store[];
      if (editingId) {
        updated = current.map(s =>
          s.id === editingId
            ? { ...s, name: formName.trim(), address: formAddress.trim(), note: formNote.trim() }
            : s
        );
      } else {
        const newStore: Store = {
          id: Date.now().toString(),
          name: formName.trim(),
          address: formAddress.trim(),
          note: formNote.trim(),
          addedAt: Date.now(),
        };
        updated = [newStore, ...current];
      }
      await saveStores(updated);
      setStores(updated);
      setShowForm(false);
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar o supermercado.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (id: string, name: string) => {
    Alert.alert(
      'Remover supermercado',
      `Deseja remover "${name}" da sua lista?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            const updated = stores.filter(s => s.id !== id);
            await saveStores(updated);
            setStores(updated);
          },
        },
      ]
    );
  };

  const addBtn = (
    <TouchableOpacity onPress={openAdd} accessibilityLabel="Adicionar supermercado">
      <Feather name="plus" size={24} color={colors.primary} />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScreenHeader title="Meus Supermercados" left={<TouchableOpacity onPress={() => navigation.goBack()}><Feather name="arrow-left" size={24} color={colors.text} /></TouchableOpacity>} />
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScreenHeader
        title="Meus Supermercados"
        left={
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Feather name="arrow-left" size={24} color={colors.text} />
          </TouchableOpacity>
        }
        right={addBtn}
      />

      {showForm && (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>{editingId ? 'Editar supermercado' : 'Novo supermercado'}</Text>
          <TextInput
            style={styles.input}
            placeholder="Nome do supermercado *"
            placeholderTextColor={colors.textSecondary}
            value={formName}
            onChangeText={setFormName}
            returnKeyType="next"
            onSubmitEditing={() => addressRef.current?.focus()}
            blurOnSubmit={false}
          />
          <TextInput
            ref={addressRef}
            style={styles.input}
            placeholder="Endereço (opcional)"
            placeholderTextColor={colors.textSecondary}
            value={formAddress}
            onChangeText={setFormAddress}
            returnKeyType="next"
            onSubmitEditing={() => noteRef.current?.focus()}
            blurOnSubmit={false}
          />
          <TextInput
            ref={noteRef}
            style={styles.input}
            placeholder="Observação (opcional)"
            placeholderTextColor={colors.textSecondary}
            value={formNote}
            onChangeText={setFormNote}
            returnKeyType="done"
          />
          <View style={styles.formBtns}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowForm(false)}>
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
              {saving
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.saveBtnText}>Salvar</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      )}

      <FlatList
        data={stores}
        keyExtractor={item => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchStores(); }} colors={[colors.primary]} />
        }
        contentContainerStyle={stores.length === 0 ? styles.emptyContainer : styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Feather name="map-pin" size={56} color={colors.border} />
            <Text style={styles.emptyTitle}>Nenhum supermercado</Text>
            <Text style={styles.emptySubtitle}>Adicione seus supermercados favoritos para acesso rápido durante as compras.</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={openAdd}>
              <Text style={styles.emptyBtnText}>Adicionar supermercado</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.storeCard}>
            <View style={styles.storeIcon}>
              <Feather name="shopping-bag" size={22} color={colors.primary} />
            </View>
            <View style={styles.storeInfo}>
              <Text style={styles.storeName}>{item.name}</Text>
              {item.address ? <Text style={styles.storeAddress}>{item.address}</Text> : null}
              {item.note ? <Text style={styles.storeNote}>{item.note}</Text> : null}
            </View>
            <View style={styles.storeActions}>
              <TouchableOpacity onPress={() => openEdit(item)} style={styles.actionBtn}>
                <Feather name="edit-2" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => confirmDelete(item.id, item.name)} style={styles.actionBtn}>
                <Feather name="trash-2" size={18} color={colors.error} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
};

const getStyles = (colors: any) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  formCard: {
    backgroundColor: colors.surface,
    margin: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: theme.spacing.md,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.background,
    marginBottom: theme.spacing.sm,
  },
  formBtns: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  cancelBtn: {
    flex: 1,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  cancelBtnText: { color: colors.text, fontSize: 15, fontWeight: '500' },
  saveBtn: {
    flex: 1,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  listContent: { padding: theme.spacing.md, gap: theme.spacing.sm },
  emptyContainer: { flex: 1 },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: theme.spacing.lg,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
    lineHeight: 20,
  },
  emptyBtn: {
    marginTop: theme.spacing.xl,
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: theme.borderRadius.round,
  },
  emptyBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  storeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  storeIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  storeInfo: { flex: 1 },
  storeName: { fontSize: 16, fontWeight: 'bold', color: colors.text },
  storeAddress: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  storeNote: { fontSize: 13, color: colors.textSecondary, fontStyle: 'italic', marginTop: 2 },
  storeActions: { flexDirection: 'row', gap: 8 },
  actionBtn: { padding: 8 },
});
