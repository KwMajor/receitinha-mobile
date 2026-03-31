import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, SectionList, TouchableOpacity, StyleSheet,
  SafeAreaView, TextInput, KeyboardAvoidingView, Platform,
  Alert, ActivityIndicator, Animated,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect, RouteProp } from '@react-navigation/native';
import { theme } from '../../constants/theme';
import { ShoppingItem } from '../../types';
import {
  getListById, getItems, toggleItem, removeItem,
  clearChecked, addItem,
} from '../../services/sqlite/shoppingService';

type RouteParams = {
  ShoppingListDetail: {
    listId: string;
    fromPlan?: boolean;
  };
};

const CATEGORY_ORDER = [
  'Hortifruti', 'Carnes e Peixes', 'Laticínios', 'Padaria',
  'Mercearia', 'Bebidas', 'Temperos', 'Outros',
];

interface Section {
  title: string;
  data: ShoppingItem[];
}

function buildSections(items: ShoppingItem[]): Section[] {
  const grouped = new Map<string, ShoppingItem[]>();

  for (const item of items) {
    const cat = item.category || 'Outros';
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(item);
  }

  const sections: Section[] = [];
  for (const cat of CATEGORY_ORDER) {
    if (grouped.has(cat)) {
      sections.push({ title: cat, data: grouped.get(cat)! });
      grouped.delete(cat);
    }
  }
  // Any remaining unknown categories
  for (const [cat, data] of grouped) {
    sections.push({ title: cat, data });
  }

  return sections;
}

export const ShoppingListDetailScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RouteParams, 'ShoppingListDetail'>>();
  const { listId, fromPlan } = route.params;

  const [listName, setListName] = useState('');
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [inputText, setInputText] = useState('');

  // Success banner for fromPlan
  const bannerOpacity = useRef(new Animated.Value(fromPlan ? 1 : 0)).current;
  const [showBanner, setShowBanner] = useState(!!fromPlan);

  useEffect(() => {
    if (!fromPlan) return;
    const timer = setTimeout(() => {
      Animated.timing(bannerOpacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => setShowBanner(false));
    }, 3000);
    return () => clearTimeout(timer);
  }, [fromPlan, bannerOpacity]);

  const isFirstLoad = useRef(true);

  const loadData = useCallback(async (showSpinner = false) => {
    if (showSpinner) setIsLoading(true);
    try {
      const [list, allItems] = await Promise.all([
        getListById(listId),
        getItems(listId),
      ]);
      if (list) setListName(list.name);
      setItems(allItems);
    } finally {
      if (showSpinner) setIsLoading(false);
    }
  }, [listId]);

  useFocusEffect(
    useCallback(() => {
      const firstTime = isFirstLoad.current;
      isFirstLoad.current = false;
      loadData(firstTime);
    }, [loadData]),
  );

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleToggle = async (itemId: string) => {
    // Optimistic update
    setItems((prev) =>
      prev.map((it) =>
        it.id === itemId ? { ...it, isChecked: !it.isChecked } : it
      )
    );
    await toggleItem(itemId);
  };

  const handleRemoveItem = (itemId: string) => {
    setItems((prev) => prev.filter((it) => it.id !== itemId));
    removeItem(itemId);
  };

  const handleClearChecked = () => {
    const checkedCount = items.filter((it) => it.isChecked).length;
    if (checkedCount === 0) return;

    Alert.alert(
      'Limpar marcados',
      `Remover ${checkedCount} ${checkedCount === 1 ? 'item marcado' : 'itens marcados'}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpar',
          style: 'destructive',
          onPress: async () => {
            await clearChecked(listId);
            setItems((prev) => prev.filter((it) => !it.isChecked));
          },
        },
      ]
    );
  };

  const handleAddItem = async () => {
    const name = inputText.trim();
    if (!name) return;
    setInputText('');
    const newId = await addItem(listId, name);
    // Reload to get category + proper sort
    const updated = await getItems(listId);
    setItems(updated);
  };

  const handleExport = () => {
    // Placeholder — será implementado no Sprint 3 (RF22)
    Alert.alert('Em breve', 'A exportação de listas estará disponível no próximo sprint.');
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const sections = buildSections(items);
  const checkedCount = items.filter((it) => it.isChecked).length;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ActivityIndicator style={{ flex: 1 }} color={theme.colors.primary} size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{listName}</Text>
        <TouchableOpacity onPress={handleExport} style={styles.iconBtn}>
          <Feather name="share" size={20} color={theme.colors.text} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleClearChecked}
          style={[styles.iconBtn, checkedCount === 0 && styles.iconBtnDisabled]}
          disabled={checkedCount === 0}
        >
          <Feather name="check-square" size={20} color={checkedCount > 0 ? theme.colors.text : theme.colors.border} />
        </TouchableOpacity>
      </View>

      {/* fromPlan success banner */}
      {showBanner && (
        <Animated.View style={[styles.successBanner, { opacity: bannerOpacity }]}>
          <Feather name="check-circle" size={16} color={theme.colors.success} />
          <Text style={styles.successBannerText}>
            Lista gerada com sucesso a partir do planejamento!
          </Text>
        </Animated.View>
      )}

      {/* Progress bar */}
      {items.length > 0 && (
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${Math.round((checkedCount / items.length) * 100)}%` },
            ]}
          />
        </View>
      )}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={90}
      >
        {sections.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="inbox" size={48} color={theme.colors.border} />
            <Text style={styles.emptyTitle}>Lista vazia</Text>
            <Text style={styles.emptySubtitle}>
              Adicione itens usando o campo abaixo.
            </Text>
          </View>
        ) : (
          <SectionList
            sections={sections}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            stickySectionHeadersEnabled
            renderSectionHeader={({ section }) => (
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                <Text style={styles.sectionCount}>
                  {section.data.filter((i) => !i.isChecked).length}/{section.data.length}
                </Text>
              </View>
            )}
            renderItem={({ item }) => (
              <ShoppingItemRow
                item={item}
                onToggle={() => handleToggle(item.id)}
                onRemove={() => handleRemoveItem(item.id)}
              />
            )}
          />
        )}

        {/* Barcode FAB */}
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('BarcodeScanner', { listId })}
          activeOpacity={0.85}
        >
          <Feather name="camera" size={22} color="#fff" />
        </TouchableOpacity>

        {/* Footer input */}
        <View style={styles.footer}>
          <TextInput
            style={styles.footerInput}
            placeholder="Adicionar item..."
            value={inputText}
            onChangeText={setInputText}
            returnKeyType="done"
            onSubmitEditing={handleAddItem}
          />
          <TouchableOpacity
            style={[styles.addItemBtn, !inputText.trim() && styles.addItemBtnDisabled]}
            onPress={handleAddItem}
            disabled={!inputText.trim()}
          >
            <Feather name="plus" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// ── ShoppingItemRow sub-component ─────────────────────────────────────────────

interface RowProps {
  item: ShoppingItem;
  onToggle: () => void;
  onRemove: () => void;
}

const ShoppingItemRow: React.FC<RowProps> = ({ item, onToggle, onRemove }) => (
  <View style={[rowStyles.row, item.isChecked && rowStyles.rowChecked]}>
    <TouchableOpacity onPress={onToggle} style={rowStyles.checkbox} activeOpacity={0.7}>
      <Feather
        name={item.isChecked ? 'check-square' : 'square'}
        size={22}
        color={item.isChecked ? theme.colors.success : theme.colors.border}
      />
    </TouchableOpacity>

    <View style={rowStyles.info}>
      <Text style={[rowStyles.name, item.isChecked && rowStyles.nameChecked]}>
        {item.name}
      </Text>
      {(item.quantity != null || item.unit) && (
        <Text style={rowStyles.qty}>
          {item.quantity != null ? item.quantity : ''}
          {item.unit ? ` ${item.unit}` : ''}
        </Text>
      )}
    </View>

    <TouchableOpacity onPress={onRemove} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
      <Feather name="x" size={16} color={theme.colors.textSecondary} />
    </TouchableOpacity>
  </View>
);

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    gap: theme.spacing.sm,
  },
  rowChecked: { opacity: 0.5 },
  checkbox: { padding: 2 },
  info: { flex: 1 },
  name: { fontSize: 15, color: theme.colors.text },
  nameChecked: { textDecorationLine: 'line-through', color: theme.colors.textSecondary },
  qty: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 1 },
});

// ── Screen styles ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    gap: 4,
  },
  backBtn: { padding: theme.spacing.sm },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.text,
    marginLeft: theme.spacing.xs,
  },
  iconBtn: { padding: theme.spacing.sm },
  iconBtnDisabled: { opacity: 0.4 },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.success + '15',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.success + '30',
  },
  successBannerText: { fontSize: 13, color: theme.colors.success, fontWeight: '500', flex: 1 },
  progressBar: {
    height: 3,
    backgroundColor: theme.colors.border,
  },
  progressFill: {
    height: 3,
    backgroundColor: theme.colors.success,
  },
  listContent: { paddingBottom: 80 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionCount: { fontSize: 12, color: theme.colors.textSecondary },
  emptyState: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: theme.spacing.xl, gap: theme.spacing.md,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.text },
  emptySubtitle: { fontSize: 14, color: theme.colors.textSecondary, textAlign: 'center' },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    gap: theme.spacing.sm,
  },
  footerInput: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: 15,
    color: theme.colors.text,
  },
  addItemBtn: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addItemBtnDisabled: { backgroundColor: theme.colors.border },
  fab: {
    position: 'absolute',
    right: theme.spacing.md,
    bottom: 72,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
});
