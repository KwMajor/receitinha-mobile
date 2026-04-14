import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { useWeekPlan } from '../../hooks/useWeekPlan';
import { MealSlot } from '../../components/planning/MealSlot';
import { RecipePickerModal } from './RecipePickerModal';
import { generateFromWeekPlan } from '../../services/sqlite/shoppingService';
import { useAuthStore } from '../../store/authStore';
import { Recipe } from '../../types';

const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const DAY_COL_WIDTH = 54;
const MEAL_COL_WIDTH = 110;
const HEADER_HEIGHT = 52;
const CELL_HEIGHT = 62;

interface SelectedSlot {
  dayIndex: number;
  mealType: string;
}

interface DraggingSlot extends SelectedSlot {
  recipe: Recipe;
}

export const WeekPlanScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const {
    weekPlan,
    mealSlots,
    weekLabel,
    weekDates,
    weekStart,
    isLoading,
    refresh,
    goToNextWeek,
    goToPreviousWeek,
    goToWeek,
    setMeal,
    removeMeal,
    addMealSlot,
    removeExtraMealSlot,
    moveMealSlotUp,
    moveMealSlotDown,
  } = useWeekPlan();

  const [pickerTarget, setPickerTarget] = useState<SelectedSlot | null>(null);
  const [draggingSlot, setDraggingSlot] = useState<DraggingSlot | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [addSlotModalVisible, setAddSlotModalVisible] = useState(false);
  const [newSlotLabel, setNewSlotLabel] = useState('');
  const [monthPickerVisible, setMonthPickerVisible] = useState(false);
  const [pickerYear, setPickerYear] = useState(() => new Date().getFullYear());

  useEffect(() => {
    refresh();
  }, []);

  const FIXED_TYPES = new Set(['breakfast', 'lunch', 'dinner']);

  // ── Helpers ───────────────────────────────────────────────────────────────

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  // ── Slot interactions ─────────────────────────────────────────────────────

  const handleSlotPress = (dayIndex: number, mealType: string) => {
    if (draggingSlot) {
      const isSameSlot =
        draggingSlot.dayIndex === dayIndex && draggingSlot.mealType === mealType;

      if (isSameSlot) {
        setDraggingSlot(null);
        return;
      }

      const existingRecipe = weekPlan[dayIndex]?.[mealType];

      if (existingRecipe) {
        Alert.alert(
          'Substituir refeição?',
          `"${existingRecipe.title}" já está neste slot. Deseja substituir?`,
          [
            { text: 'Cancelar', style: 'cancel', onPress: () => setDraggingSlot(null) },
            {
              text: 'Substituir',
              onPress: async () => {
                await setMeal(dayIndex, mealType, draggingSlot.recipe.id);
                await removeMeal(draggingSlot.dayIndex, draggingSlot.mealType);
                setDraggingSlot(null);
              },
            },
          ]
        );
      } else {
        setMeal(dayIndex, mealType, draggingSlot.recipe.id).then(() =>
          removeMeal(draggingSlot.dayIndex, draggingSlot.mealType)
        );
        setDraggingSlot(null);
      }
      return;
    }

    setPickerTarget({ dayIndex, mealType });
  };

  const handleSlotLongPress = (dayIndex: number, mealType: string) => {
    const recipe = weekPlan[dayIndex]?.[mealType];
    if (!recipe) return;
    setDraggingSlot({ dayIndex, mealType, recipe });
  };

  const handleRemove = (dayIndex: number, mealType: string) => {
    removeMeal(dayIndex, mealType);
  };

  const handlePickerSelect = async (recipe: Recipe) => {
    if (!pickerTarget) return;
    await setMeal(pickerTarget.dayIndex, pickerTarget.mealType, recipe.id);
    setPickerTarget(null);
  };

  const handleAddSlot = async () => {
    const label = newSlotLabel.trim();
    if (!label) return;
    await addMealSlot(label);
    setNewSlotLabel('');
    setAddSlotModalVisible(false);
  };

  const handleRemoveExtraSlot = (mealType: string, label: string) => {
    Alert.alert(
      'Remover refeição?',
      `Deseja remover a refeição "${label}" desta semana? As receitas planejadas neste slot serão perdidas.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: () => removeExtraMealSlot(mealType),
        },
      ]
    );
  };

  const handleSelectMonth = (year: number, month: number) => {
    const first = new Date(year, month, 1, 12);
    const dayOfWeek = first.getDay();
    first.setDate(first.getDate() - dayOfWeek);
    const ws = first.toISOString().split('T')[0];
    goToWeek(ws);
    setMonthPickerVisible(false);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.navBtn} onPress={goToPreviousWeek} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Feather name="chevron-left" size={22} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.weekLabel}>{weekLabel}</Text>
          <TouchableOpacity
            onPress={() => {
              setPickerYear(new Date().getFullYear());
              setMonthPickerVisible(true);
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="calendar" size={16} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.navBtn} onPress={goToNextWeek} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Feather name="chevron-right" size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Shopping list button */}
      <TouchableOpacity
        style={styles.shoppingBtn}
        onPress={async () => {
          if (!user || isGenerating) return;
          setIsGenerating(true);
          try {
            const listId = await generateFromWeekPlan(user.id, weekStart);
            navigation.navigate('ShoppingStack', {
              screen: 'ShoppingListDetail',
              params: { listId, fromPlan: true },
            });
          } catch {
            Alert.alert('Erro', 'Não foi possível gerar a lista de compras.');
          } finally {
            setIsGenerating(false);
          }
        }}
        disabled={isGenerating}
        activeOpacity={0.8}
      >
        {isGenerating
          ? <ActivityIndicator size="small" color="#fff" />
          : <Feather name="shopping-cart" size={16} color="#fff" />}
        <Text style={styles.shoppingBtnText}>
          {isGenerating ? 'Gerando...' : 'Gerar lista de compras'}
        </Text>
      </TouchableOpacity>

      {/* Drag mode banner */}
      {draggingSlot && (
        <View style={styles.dragBanner}>
          <Feather name="move" size={14} color={colors.primary} />
          <Text style={styles.dragBannerText}>
            Toque em um slot para mover "{draggingSlot.recipe.title}"
          </Text>
          <TouchableOpacity onPress={() => setDraggingSlot(null)}>
            <Feather name="x" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      )}

      {/* Grid */}
      {isLoading ? (
        <ActivityIndicator style={styles.loader} color={colors.primary} size="large" />
      ) : (
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          <View style={styles.gridContainer}>
            {/* Fixed left column: empty corner + day labels */}
            <View style={styles.leftColumn}>
              <View style={{ height: HEADER_HEIGHT }} />
              {weekDates.map((date, dayIndex) => (
                <View
                  key={dayIndex}
                  style={[styles.dayLabelCell, isToday(date) && styles.dayLabelToday]}
                >
                  <Text style={[styles.dayName, isToday(date) && styles.dayNameToday]}>
                    {DAY_NAMES[dayIndex]}
                  </Text>
                  <Text style={[styles.dayNumber, isToday(date) && styles.dayNumberToday]}>
                    {date.getDate()}
                  </Text>
                </View>
              ))}
            </View>

            {/* Horizontally scrollable: meal type headers + cells */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
              <View>
                {/* Meal type header row */}
                <View style={[styles.mealHeaderRow, { height: HEADER_HEIGHT }]}>
                  {mealSlots.map((slot, idx) => (
                    <View
                      key={slot.mealType}
                      style={[styles.mealHeaderCell, { width: MEAL_COL_WIDTH }]}
                    >
                      <Text style={styles.mealHeaderText} numberOfLines={1}>
                        {slot.label}
                      </Text>
                      <View style={styles.mealHeaderActions}>
                        <TouchableOpacity
                          onPress={() => moveMealSlotUp(slot.mealType)}
                          disabled={idx === 0}
                          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                        >
                          <Feather
                            name="chevron-left"
                            size={12}
                            color={idx === 0 ? colors.border : colors.textSecondary}
                          />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => moveMealSlotDown(slot.mealType)}
                          disabled={idx === mealSlots.length - 1}
                          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                        >
                          <Feather
                            name="chevron-right"
                            size={12}
                            color={
                              idx === mealSlots.length - 1
                                ? colors.border
                                : colors.textSecondary
                            }
                          />
                        </TouchableOpacity>
                        {!FIXED_TYPES.has(slot.mealType) && (
                          <TouchableOpacity
                            onPress={() => handleRemoveExtraSlot(slot.mealType, slot.label)}
                            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                          >
                            <Feather name="x" size={11} color={colors.textSecondary} />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  ))}

                  {/* Add meal slot button */}
                  <TouchableOpacity
                    style={styles.addSlotBtn}
                    onPress={() => setAddSlotModalVisible(true)}
                  >
                    <Feather name="plus" size={14} color={colors.primary} />
                  </TouchableOpacity>
                </View>

                {/* Day rows */}
                {weekDates.map((_date, dayIndex) => (
                  <View key={dayIndex} style={[styles.mealRow, { height: CELL_HEIGHT }]}>
                    {mealSlots.map((slot) => {
                      const isDragSrc =
                        draggingSlot?.dayIndex === dayIndex &&
                        draggingSlot?.mealType === slot.mealType;
                      const isDropTgt =
                        draggingSlot !== null && !isDragSrc;
                      return (
                        <View key={slot.mealType} style={[styles.slotWrapper, { width: MEAL_COL_WIDTH }]}>
                          <MealSlot
                            label=""
                            recipe={weekPlan[dayIndex]?.[slot.mealType] ?? null}
                            onPress={() => handleSlotPress(dayIndex, slot.mealType)}
                            onLongPress={() => handleSlotLongPress(dayIndex, slot.mealType)}
                            onRemove={() => handleRemove(dayIndex, slot.mealType)}
                            isDropTarget={isDropTgt}
                            isDragging={isDragSrc}
                          />
                        </View>
                      );
                    })}
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        </ScrollView>
      )}

      {/* Recipe picker modal */}
      <RecipePickerModal
        visible={pickerTarget !== null}
        onClose={() => setPickerTarget(null)}
        onSelect={handlePickerSelect}
      />

      {/* Add meal slot modal */}
      <Modal
        visible={addSlotModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAddSlotModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Nova refeição</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ex: Lanche da tarde"
              placeholderTextColor={colors.textSecondary}
              value={newSlotLabel}
              onChangeText={setNewSlotLabel}
              autoFocus
              onSubmitEditing={handleAddSlot}
              returnKeyType="done"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => {
                  setNewSlotLabel('');
                  setAddSlotModalVisible(false);
                }}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmBtn, !newSlotLabel.trim() && styles.modalConfirmDisabled]}
                onPress={handleAddSlot}
                disabled={!newSlotLabel.trim()}
              >
                <Text style={styles.modalConfirmText}>Adicionar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Month picker modal */}
      <Modal
        visible={monthPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMonthPickerVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setMonthPickerVisible(false)}
        >
          <TouchableOpacity style={styles.monthPickerCard} activeOpacity={1}>
            <View style={styles.yearRow}>
              <TouchableOpacity
                onPress={() => setPickerYear((y) => y - 1)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather name="chevron-left" size={22} color={colors.text} />
              </TouchableOpacity>
              <Text style={styles.yearText}>{pickerYear}</Text>
              <TouchableOpacity
                onPress={() => setPickerYear((y) => y + 1)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather name="chevron-right" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.monthGrid}>
              {MONTH_NAMES.map((name, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.monthBtn}
                  onPress={() => handleSelectMonth(pickerYear, idx)}
                >
                  <Text style={styles.monthBtnText}>{name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const getStyles = (colors: any) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    minHeight: 56,
  },
  navBtn: {},
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  weekLabel: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
    textTransform: 'capitalize',
  },
  shoppingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: theme.borderRadius.md,
    margin: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.sm,
    alignSelf: 'flex-start',
  },
  shoppingBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  dragBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '15',
    borderRadius: theme.borderRadius.md,
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  dragBannerText: { flex: 1, fontSize: 12, color: colors.text },
  loader: { flex: 1, alignSelf: 'center' },
  // Grid
  gridContainer: {
    flexDirection: 'row',
    paddingBottom: theme.spacing.md,
  },
  leftColumn: {
    width: DAY_COL_WIDTH,
    paddingLeft: theme.spacing.sm,
  },
  dayLabelCell: {
    height: CELL_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: theme.borderRadius.md,
  },
  dayLabelToday: { backgroundColor: colors.primary + '15' },
  dayName: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  dayNameToday: { color: colors.primary },
  dayNumber: { fontSize: 16, fontWeight: '700', color: colors.text, marginTop: 2 },
  dayNumberToday: { color: colors.primary },
  mealHeaderRow: { flexDirection: 'row', alignItems: 'center' },
  mealHeaderCell: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    gap: 4,
  },
  mealHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
    textTransform: 'uppercase',
  },
  mealHeaderActions: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  addSlotBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 6,
  },
  mealRow: { flexDirection: 'row', alignItems: 'center' },
  slotWrapper: { paddingHorizontal: 3 },
  // Modals (shared)
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  modalCard: {
    width: '100%',
    backgroundColor: colors.background,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
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
  modalActions: { flexDirection: 'row', gap: theme.spacing.sm, justifyContent: 'flex-end' },
  modalCancelBtn: { paddingVertical: theme.spacing.sm, paddingHorizontal: theme.spacing.md },
  modalCancelText: { fontSize: 14, color: colors.textSecondary },
  modalConfirmBtn: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: colors.primary,
    borderRadius: theme.borderRadius.md,
  },
  modalConfirmDisabled: { opacity: 0.4 },
  modalConfirmText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  // Month picker
  monthPickerCard: {
    width: '85%',
    backgroundColor: colors.background,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  yearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  yearText: { fontSize: 18, fontWeight: '700', color: colors.text },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  monthBtn: {
    width: '30%',
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  monthBtnText: { fontSize: 14, fontWeight: '600', color: colors.text },
});
