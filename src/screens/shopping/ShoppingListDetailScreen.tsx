import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, SectionList, TouchableOpacity, Pressable, StyleSheet,
  TextInput, KeyboardAvoidingView, Platform,
  Alert, ActivityIndicator, Animated, Modal, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect, RouteProp } from '@react-navigation/native';
import { theme } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { ShoppingItem, ShoppingList } from '../../types';
import {
  getListById, getItems, toggleItem, removeItem,
  clearChecked, addItem, deleteList, setItemPrice, finalizeSpending,
} from '../../services/sqlite/shoppingService';
import { exportAsPDF, exportAsText, exportAsWhatsApp } from '../../services/exportService';
import { useAuthStore } from '../../store/authStore';
import { importFromShoppingList } from '../../services/sqlite/pantryService';
import { useTimersStore } from '../../store/timersStore';

const UNITS = ['un', 'kg', 'g', 'L', 'ml', 'cx', 'pct', 'dz'];

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

const CATEGORY_META: Record<string, { icon: string; color: string }> = {
  'Hortifruti':      { icon: 'sun',         color: '#4CAF50' },
  'Carnes e Peixes': { icon: 'scissors',    color: '#EF5350' },
  'Laticínios':      { icon: 'droplet',     color: '#42A5F5' },
  'Padaria':         { icon: 'coffee',      color: '#FFA726' },
  'Mercearia':       { icon: 'package',     color: '#AB47BC' },
  'Bebidas':         { icon: 'thermometer', color: '#26C6DA' },
  'Temperos':        { icon: 'wind',        color: '#FF7043' },
  'Outros':          { icon: 'grid',        color: '#78909C' },
};

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
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const { user } = useAuthStore();
  const { openDrawer } = useTimersStore();

  const [listName, setListName] = useState('');
  const [list, setList] = useState<ShoppingList | null>(null);
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [exporting, setExporting] = useState<'pdf' | 'text' | 'whatsapp' | null>(null);

  // Add item modal
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [modalName, setModalName] = useState('');
  const [modalQty, setModalQty] = useState('');
  const [modalUnit, setModalUnit] = useState<string | null>(null);
  const [modalPrice, setModalPrice] = useState('');

  // Price edit modal
  const [priceModalVisible, setPriceModalVisible] = useState(false);
  const [priceModalItem, setPriceModalItem] = useState<ShoppingItem | null>(null);
  const [priceModalValue, setPriceModalValue] = useState('');

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
      if (list) { setListName(list.name); setList(list); }
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

  const handleExport = async (type: 'pdf' | 'text' | 'whatsapp') => {
    if (!list) return;
    setExportModalVisible(false);
    setExporting(type);
    try {
      if (type === 'pdf') await exportAsPDF(list, items);
      else if (type === 'text') await exportAsText(list, items);
      else await exportAsWhatsApp(list, items);
    } catch (e: any) {
      Alert.alert('Erro ao exportar', e?.message ?? 'Tente novamente.');
    } finally {
      setExporting(null);
    }
  };

  const handleDeleteList = () => {
    Alert.alert(
      'Excluir lista',
      `Deseja excluir "${listName}"? Esta ação não pode ser desfeita.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            await deleteList(listId);
            navigation.goBack();
          },
        },
      ]
    );
  };

  const handleToggle = async (itemId: string) => {
    const updated = items.map((it) =>
      it.id === itemId ? { ...it, isChecked: !it.isChecked } : it
    );
    setItems(updated);
    await toggleItem(itemId);

    const allChecked = updated.length > 0 && updated.every((it) => it.isChecked);
    if (allChecked) {
      // Auto-import all checked items to pantry silently
      if (user) {
        importFromShoppingList(user.id, listId).catch(() => {});
      }
      Alert.alert(
        'Lista concluída! 🎉',
        'Itens adicionados à sua despensa automaticamente. Deseja excluir esta lista?',
        [
          {
            text: 'Manter lista',
            style: 'cancel',
            onPress: () => { finalizeSpending(listId).catch(() => {}); },
          },
          {
            text: 'Excluir',
            style: 'destructive',
            onPress: async () => {
              await deleteList(listId);
              navigation.goBack();
            },
          },
        ]
      );
    }
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

  const openPriceModal = (item: ShoppingItem) => {
    setPriceModalItem(item);
    setPriceModalValue(item.price != null ? String(item.price.toFixed(2).replace('.', ',')) : '');
    setPriceModalVisible(true);
  };

  const handlePriceConfirm = async () => {
    if (!priceModalItem) return;
    const parsed = parseFloat(priceModalValue.replace(',', '.'));
    const price = !isNaN(parsed) && parsed >= 0 ? parsed : null;
    setPriceModalVisible(false);
    await setItemPrice(priceModalItem.id, price).catch(() => {});
    setItems((prev) => prev.map((it) =>
      it.id === priceModalItem.id ? { ...it, price: price ?? undefined } : it
    ));
  };

  const openAddModal = () => {
    setModalName(inputText.trim());
    setModalQty('');
    setModalUnit(null);
    setModalPrice('');
    setInputText('');
    setAddModalVisible(true);
  };

  const handleConfirmAdd = async () => {
    const name = modalName.trim();
    if (!name) return;
    const qty = modalQty.trim() ? parseFloat(modalQty.trim()) : undefined;
    const unit = modalUnit ?? undefined;
    const price = modalPrice.trim() ? parseFloat(modalPrice.trim().replace(',', '.')) : undefined;
    setAddModalVisible(false);
    const newId = await addItem(listId, name, isNaN(qty as number) ? undefined : qty, unit);
    if (price != null && !isNaN(price)) {
      await setItemPrice(newId, price).catch(() => {});
    }
    const updated = await getItems(listId);
    setItems(updated);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const sections = buildSections(items);
  const checkedCount = items.filter((it) => it.isChecked).length;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ActivityIndicator style={{ flex: 1 }} color={colors.primary} size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{listName}</Text>
        <TouchableOpacity
          onPress={handleClearChecked}
          style={[styles.iconBtn, checkedCount === 0 && styles.iconBtnDisabled]}
          disabled={checkedCount === 0}
          accessibilityLabel="Limpar itens marcados"
        >
          <Feather name="check-square" size={20} color={checkedCount > 0 ? colors.text : colors.border} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setExportModalVisible(true)}
          style={[styles.iconBtn, items.length === 0 && styles.iconBtnDisabled]}
          disabled={items.length === 0}
          accessibilityLabel="Exportar lista"
        >
          {exporting ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Feather name="share-2" size={20} color={colors.text} />
          )}
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => openDrawer(true)}
          style={styles.timerBtn}
          accessibilityLabel="Adicionar timer"
        >
          <Feather name="clock" size={13} color={colors.primary} />
          <Text style={styles.timerBtnText}>+ Timer</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleDeleteList}
          style={styles.iconBtn}
          accessibilityLabel="Excluir lista"
        >
          <Feather name="trash-2" size={20} color={colors.error} />
        </TouchableOpacity>
      </View>

      {/* fromPlan success banner */}
      {showBanner && (
        <Animated.View style={[styles.successBanner, { opacity: bannerOpacity }]}>
          <Feather name="check-circle" size={16} color={colors.success} />
          <Text style={styles.successBannerText}>
            Lista gerada com sucesso a partir do planejamento!
          </Text>
        </Animated.View>
      )}


      {/* Progress bar */}
      {items.length > 0 && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.round((checkedCount / items.length) * 100)}%` },
              ]}
            />
          </View>
          <Text style={styles.progressLabel}>
            {checkedCount}/{items.length}
          </Text>
        </View>
      )}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
      >
        {sections.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="inbox" size={48} color={colors.border} />
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
            renderSectionHeader={({ section }) => {
              const meta = CATEGORY_META[section.title] ?? CATEGORY_META['Outros'];
              return (
                <View style={[styles.sectionHeader, { borderLeftColor: meta.color }]}>
                  <Feather name={meta.icon as any} size={14} color={meta.color} />
                  <Text style={[styles.sectionTitle, { color: meta.color }]}>{section.title}</Text>
                  <Text style={styles.sectionCount}>
                    {section.data.filter((i) => !i.isChecked).length}/{section.data.length}
                  </Text>
                </View>
              );
            }}
            renderItem={({ item }) => (
              <ShoppingItemRow
                item={item}
                onToggle={() => handleToggle(item.id)}
                onRemove={() => handleRemoveItem(item.id)}
                onPricePress={() => openPriceModal(item)}
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
            placeholderTextColor={colors.textSecondary}
            value={inputText}
            onChangeText={setInputText}
            returnKeyType="done"
            onSubmitEditing={openAddModal}
          />
          <TouchableOpacity
            style={styles.addItemBtn}
            onPress={openAddModal}
          >
            <Feather name="plus" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Add item modal */}
      <Modal
        visible={addModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAddModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableOpacity
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            activeOpacity={1}
            onPress={() => setAddModalVisible(false)}
          />
          <TouchableOpacity activeOpacity={1} onPress={() => {}} style={styles.modalCard}>
            <Text style={styles.modalTitle}>Adicionar item</Text>

            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>Nome</Text>
              <TextInput
                style={styles.modalInput}
                value={modalName}
                onChangeText={setModalName}
                placeholder="Ex: Leite"
                placeholderTextColor={colors.textSecondary}
                autoFocus
              />
            </View>

            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>Quantidade (opcional)</Text>
              <TextInput
                style={[styles.modalInput, styles.modalInputQty]}
                value={modalQty}
                onChangeText={(v) => setModalQty(v.replace(/[^0-9.,]/g, ''))}
                placeholder="Ex: 2"
                placeholderTextColor={colors.textSecondary}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>Unidade (opcional)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.unitsRow}>
                {UNITS.map((u) => (
                  <TouchableOpacity
                    key={u}
                    style={[styles.unitChip, modalUnit === u && styles.unitChipSelected]}
                    onPress={() => setModalUnit(modalUnit === u ? null : u)}
                  >
                    <Text style={[styles.unitChipText, modalUnit === u && styles.unitChipTextSelected]}>
                      {u}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>Preço estimado (opcional)</Text>
              <View style={styles.priceInputRow}>
                <Text style={styles.priceCurrency}>R$</Text>
                <TextInput
                  style={[styles.modalInput, styles.priceInput]}
                  value={modalPrice}
                  onChangeText={(v) => setModalPrice(v.replace(/[^0-9.,]/g, ''))}
                  placeholder="0,00"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setAddModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmBtn, !modalName.trim() && styles.modalConfirmDisabled]}
                onPress={handleConfirmAdd}
                disabled={!modalName.trim()}
              >
                <Text style={styles.modalConfirmText}>Adicionar</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* Price edit modal */}
      <Modal
        visible={priceModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPriceModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableOpacity
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            activeOpacity={1}
            onPress={() => setPriceModalVisible(false)}
          />
          <TouchableOpacity activeOpacity={1} onPress={() => {}} style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {priceModalItem?.price != null ? 'Editar preço' : 'Adicionar preço'}
            </Text>
            <Text style={styles.modalLabel}>{priceModalItem?.name}</Text>
            <View style={styles.priceInputRow}>
              <Text style={styles.priceCurrency}>R$</Text>
              <TextInput
                style={[styles.modalInput, styles.priceInput]}
                value={priceModalValue}
                onChangeText={(v) => setPriceModalValue(v.replace(/[^0-9.,]/g, ''))}
                placeholder="0,00"
                placeholderTextColor={colors.textSecondary}
                keyboardType="decimal-pad"
                autoFocus
              />
            </View>
            <View style={styles.modalActions}>
              {priceModalItem?.price != null && (
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={async () => {
                    setPriceModalVisible(false);
                    await setItemPrice(priceModalItem!.id, null).catch(() => {});
                    setItems((prev) => prev.map((it) =>
                      it.id === priceModalItem!.id ? { ...it, price: undefined } : it
                    ));
                  }}
                >
                  <Text style={[styles.modalCancelText, { color: colors.error }]}>Remover</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setPriceModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={handlePriceConfirm}
              >
                <Text style={styles.modalConfirmText}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* Export action sheet */}
      <Modal
        visible={exportModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setExportModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            activeOpacity={1}
            onPress={() => setExportModalVisible(false)}
          />
          <View style={styles.exportSheet}>
            <View style={styles.exportHandle} />
            <Text style={styles.exportTitle}>Exportar lista</Text>

            <TouchableOpacity style={styles.exportOption} onPress={() => handleExport('pdf')}>
              <View style={[styles.exportIcon, { backgroundColor: '#FFEBEE' }]}>
                <Feather name="file-text" size={20} color="#E53935" />
              </View>
              <View style={styles.exportOptionInfo}>
                <Text style={styles.exportOptionLabel}>Exportar como PDF</Text>
                <Text style={styles.exportOptionSub}>Salvar ou compartilhar arquivo PDF</Text>
              </View>
              <Feather name="chevron-right" size={18} color={colors.border} />
            </TouchableOpacity>

            <View style={styles.exportDivider} />

            <TouchableOpacity style={styles.exportOption} onPress={() => handleExport('text')}>
              <View style={[styles.exportIcon, { backgroundColor: '#E3F2FD' }]}>
                <Feather name="align-left" size={20} color="#1E88E5" />
              </View>
              <View style={styles.exportOptionInfo}>
                <Text style={styles.exportOptionLabel}>Compartilhar como texto</Text>
                <Text style={styles.exportOptionSub}>E-mail, notas, SMS e outros</Text>
              </View>
              <Feather name="chevron-right" size={18} color={colors.border} />
            </TouchableOpacity>

            <View style={styles.exportDivider} />

            <TouchableOpacity style={styles.exportOption} onPress={() => handleExport('whatsapp')}>
              <View style={[styles.exportIcon, { backgroundColor: '#E8F5E9' }]}>
                <Feather name="message-circle" size={20} color="#43A047" />
              </View>
              <View style={styles.exportOptionInfo}>
                <Text style={styles.exportOptionLabel}>Enviar para WhatsApp</Text>
                <Text style={styles.exportOptionSub}>Lista compacta sem itens marcados</Text>
              </View>
              <Feather name="chevron-right" size={18} color={colors.border} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.exportCancel}
              onPress={() => setExportModalVisible(false)}
            >
              <Text style={styles.exportCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

// ── ShoppingItemRow sub-component ─────────────────────────────────────────────

interface RowProps {
  item: ShoppingItem;
  onToggle: () => void;
  onRemove: () => void;
  onPricePress: () => void;
}

const ShoppingItemRow: React.FC<RowProps> = ({ item, onToggle, onRemove, onPricePress }) => {
  const { colors } = useTheme();
  const rowStyles = getRowStyles(colors);

  return (
  <View style={[rowStyles.row, item.isChecked && rowStyles.rowChecked]}>
    <TouchableOpacity onPress={onToggle} style={[rowStyles.checkbox, item.isChecked && rowStyles.checkboxChecked]} activeOpacity={0.7}>
      {item.isChecked && <Feather name="check" size={14} color="#fff" />}
    </TouchableOpacity>

    <View style={rowStyles.info}>
      <Text style={[rowStyles.name, item.isChecked && rowStyles.nameChecked]} numberOfLines={1}>
        {item.name}
      </Text>
      {(item.quantity != null || item.unit) && (
        <Text style={rowStyles.qty}>
          {item.quantity != null ? item.quantity : ''}
          {item.unit ? ` ${item.unit}` : ''}
        </Text>
      )}
    </View>

    <Pressable onPress={onPricePress} style={rowStyles.priceBtn} hitSlop={8}>
      {item.price != null ? (
        <Text style={[rowStyles.price, item.isChecked && rowStyles.priceChecked]}>
          R$ {item.price.toFixed(2).replace('.', ',')}
        </Text>
      ) : (
        <View style={rowStyles.addPriceBtn}>
          <Feather name="tag" size={13} color={colors.textSecondary} />
        </View>
      )}
    </Pressable>

    <TouchableOpacity onPress={onRemove} style={rowStyles.removeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
      <Feather name="x" size={15} color={colors.textSecondary} />
    </TouchableOpacity>
  </View>
  );
};

const getRowStyles = (colors: any) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
    gap: theme.spacing.sm,
  },
  rowChecked: { backgroundColor: colors.surface },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '500', color: colors.text },
  nameChecked: { textDecorationLine: 'line-through', color: colors.textSecondary, fontWeight: '400' },
  qty: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  removeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priceBtn: {
    minWidth: 28,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  price: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  priceChecked: {
    color: colors.textSecondary,
  },
  addPriceBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// ── Screen styles ─────────────────────────────────────────────────────────────

const getStyles = (colors: any) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 4,
  },
  backBtn: { padding: theme.spacing.sm },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginLeft: theme.spacing.xs,
  },
  iconBtn: { padding: theme.spacing.sm },
  timerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: colors.primaryLight,
  },
  timerBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  iconBtnDisabled: { opacity: 0.4 },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success + '15',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.success + '30',
  },
  successBannerText: { fontSize: 13, color: colors.success, fontWeight: '500', flex: 1 },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 6,
    gap: 10,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
  },
  progressFill: {
    height: 6,
    backgroundColor: colors.success,
    borderRadius: 3,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    minWidth: 32,
    textAlign: 'right',
  },
  listContent: { paddingBottom: 80 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 9,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    borderLeftWidth: 3,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  sectionCount: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  emptyState: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: theme.spacing.xl, gap: theme.spacing.md,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  emptySubtitle: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingTop: 10,
    paddingBottom: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
    gap: theme.spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 6,
  },
  footerInput: {
    flex: 1,
    height: 46,
    backgroundColor: colors.surface,
    borderRadius: theme.borderRadius.round,
    paddingHorizontal: theme.spacing.md,
    fontSize: 15,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  addItemBtn: {
    width: 46,
    height: 46,
    borderRadius: theme.borderRadius.round,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 4,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    paddingBottom: 32,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  modalField: {
    gap: 6,
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  modalInputQty: {
    width: 120,
  },
  priceInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  priceCurrency: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  priceInput: {
    width: 120,
  },
  unitsRow: {
    gap: 8,
    paddingVertical: 2,
  },
  unitChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  unitChipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '15',
  },
  unitChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  unitChipTextSelected: {
    color: colors.primary,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: theme.spacing.sm,
    marginTop: 4,
  },
  modalCancelBtn: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  modalCancelText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  modalConfirmBtn: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: theme.borderRadius.md,
  },
  modalConfirmDisabled: { opacity: 0.4 },
  modalConfirmText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  fab: {
    position: 'absolute',
    right: theme.spacing.md,
    bottom: 72,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  // Export action sheet
  exportSheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingBottom: 32,
    paddingHorizontal: theme.spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 12,
  },
  exportHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: 16,
  },
  exportTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  exportOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
    gap: 14,
  },
  exportIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportOptionInfo: {
    flex: 1,
    gap: 2,
  },
  exportOptionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  exportOptionSub: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  exportDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: 4,
  },
  exportCancel: {
    marginTop: 12,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: theme.borderRadius.md,
  },
  exportCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
});
