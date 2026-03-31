import React, { useState, useEffect, useRef } from 'react';
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
import { useWeekPlan } from '../../hooks/useWeekPlan';
import { WeekDayColumn } from '../../components/planning/WeekDayColumn';
import { RecipePickerModal } from './RecipePickerModal';
import { generateFromWeekPlan } from '../../services/sqlite/shoppingService';
import { useAuthStore } from '../../store/authStore';
import { Recipe } from '../../types';

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
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    refresh();
  }, []);

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

  // ── Render ────────────────────────────────────────────────────────────────

  const FIXED_TYPES = new Set(['breakfast', 'lunch', 'dinner']);

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.navBtn} onPress={goToPreviousWeek}>
          <Feather name="chevron-left" size={22} color={theme.colors.text} />
        </TouchableOpacity>

        <Text style={styles.weekLabel}>{weekLabel}</Text>

        <TouchableOpacity style={styles.navBtn} onPress={goToNextWeek}>
          <Feather name="chevron-right" size={22} color={theme.colors.text} />
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
          <Feather name="move" size={14} color={theme.colors.primary} />
          <Text style={styles.dragBannerText}>
            Toque em um slot para mover "{draggingSlot.recipe.title}"
          </Text>
          <TouchableOpacity onPress={() => setDraggingSlot(null)}>
            <Feather name="x" size={16} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>
      )}

      {/* Grid */}
      <View style={styles.gridRow}>
        {/* Meal type labels column */}
        <View style={styles.mealLabels}>
          <View style={styles.mealLabelHeader} />

          {mealSlots.map((slot, idx) => (
            <View key={slot.mealType} style={styles.mealLabelRow}>
              <View style={styles.mealLabelContent}>
                <Text style={styles.mealLabelText} numberOfLines={1}>
                  {slot.label}
                </Text>
                <View style={styles.mealLabelActions}>
                  <TouchableOpacity
                    onPress={() => moveMealSlotUp(slot.mealType)}
                    disabled={idx === 0}
                    hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                  >
                    <Feather
                      name="chevron-up"
                      size={12}
                      color={idx === 0 ? theme.colors.border : theme.colors.textSecondary}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => moveMealSlotDown(slot.mealType)}
                    disabled={idx === mealSlots.length - 1}
                    hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                  >
                    <Feather
                      name="chevron-down"
                      size={12}
                      color={idx === mealSlots.length - 1 ? theme.colors.border : theme.colors.textSecondary}
                    />
                  </TouchableOpacity>
                  {!FIXED_TYPES.has(slot.mealType) && (
                    <TouchableOpacity
                      onPress={() => handleRemoveExtraSlot(slot.mealType, slot.label)}
                      hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                    >
                      <Feather name="x" size={11} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          ))}

          {/* Add meal slot button */}
          <TouchableOpacity
            style={styles.addSlotBtn}
            onPress={() => setAddSlotModalVisible(true)}
          >
            <Feather name="plus" size={14} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Week grid */}
        {isLoading ? (
          <ActivityIndicator
            style={styles.loader}
            color={theme.colors.primary}
            size="large"
          />
        ) : (
          <ScrollView
            ref={scrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {weekDates.map((date, dayIndex) => (
              <WeekDayColumn
                key={dayIndex}
                dayIndex={dayIndex}
                date={date}
                plan={weekPlan[dayIndex] ?? {}}
                mealSlots={mealSlots}
                draggingSlot={draggingSlot}
                onSlotPress={(mealType) => handleSlotPress(dayIndex, mealType)}
                onSlotLongPress={(mealType) => handleSlotLongPress(dayIndex, mealType)}
                onRemove={(mealType) => handleRemove(dayIndex, mealType)}
              />
            ))}
          </ScrollView>
        )}
      </View>

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
              placeholderTextColor={theme.colors.textSecondary}
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
    </SafeAreaView>
  );
};

const MEAL_ROW_HEIGHT = 56 + 6;
const HEADER_HEIGHT = 50;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  navBtn: {
    padding: theme.spacing.sm,
  },
  weekLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.text,
    textTransform: 'capitalize',
  },
  shoppingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    margin: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.sm,
    alignSelf: 'flex-start',
  },
  shoppingBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  dragBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary + '15',
    borderRadius: theme.borderRadius.md,
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  dragBannerText: {
    flex: 1,
    fontSize: 12,
    color: theme.colors.text,
  },
  gridRow: {
    flex: 1,
    flexDirection: 'row',
  },
  mealLabels: {
    width: 68,
    paddingLeft: theme.spacing.sm,
  },
  mealLabelHeader: {
    height: HEADER_HEIGHT,
  },
  mealLabelRow: {
    height: MEAL_ROW_HEIGHT,
    justifyContent: 'center',
  },
  mealLabelContent: {
    gap: 2,
  },
  mealLabelText: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  mealLabelActions: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },
  addSlotBtn: {
    marginTop: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingRight: theme.spacing.md,
  },
  loader: {
    flex: 1,
    alignSelf: 'center',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  modalCard: {
    width: '100%',
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: 15,
    color: theme.colors.text,
    backgroundColor: theme.colors.surface,
  },
  modalActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    justifyContent: 'flex-end',
  },
  modalCancelBtn: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  modalCancelText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  modalConfirmBtn: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
  },
  modalConfirmDisabled: {
    opacity: 0.4,
  },
  modalConfirmText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
