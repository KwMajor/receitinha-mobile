import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../../constants/theme';
import { useWeekPlan } from '../../hooks/useWeekPlan';
import { WeekDayColumn } from '../../components/planning/WeekDayColumn';
import { RecipePickerModal } from './RecipePickerModal';
import { MealType } from '../../services/sqlite/planningService';
import { generateFromWeekPlan } from '../../services/sqlite/shoppingService';
import { useAuthStore } from '../../store/authStore';
import { Recipe } from '../../types';

interface SelectedSlot {
  dayIndex: number;
  mealType: MealType;
}

interface DraggingSlot extends SelectedSlot {
  recipe: Recipe;
}

export const WeekPlanScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const {
    weekPlan,
    weekLabel,
    weekDates,
    weekStart,
    isLoading,
    refresh,
    goToNextWeek,
    goToPreviousWeek,
    setMeal,
    removeMeal,
  } = useWeekPlan();

  const [pickerTarget, setPickerTarget] = useState<SelectedSlot | null>(null);
  const [draggingSlot, setDraggingSlot] = useState<DraggingSlot | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    refresh();
  }, []);

  // ── Slot interactions ─────────────────────────────────────────────────────

  const handleSlotPress = (dayIndex: number, mealType: MealType) => {
    if (draggingSlot) {
      // Drop: place dragged recipe into this slot, clear source
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

    // Normal press: open picker
    setPickerTarget({ dayIndex, mealType });
  };

  const handleSlotLongPress = (dayIndex: number, mealType: MealType) => {
    const recipe = weekPlan[dayIndex]?.[mealType];
    if (!recipe) return;
    setDraggingSlot({ dayIndex, mealType, recipe });
  };

  const handleRemove = (dayIndex: number, mealType: MealType) => {
    removeMeal(dayIndex, mealType);
  };

  const handlePickerSelect = async (recipe: Recipe) => {
    if (!pickerTarget) return;
    await setMeal(pickerTarget.dayIndex, pickerTarget.mealType, recipe.id);
    setPickerTarget(null);
  };

  // ── Render ────────────────────────────────────────────────────────────────

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

      {/* Meal type labels column */}
      <View style={styles.gridRow}>
        <View style={styles.mealLabels}>
          <View style={styles.mealLabelHeader} />
          {(['Café', 'Almoço', 'Jantar'] as const).map((label) => (
            <View key={label} style={styles.mealLabelRow}>
              <Text style={styles.mealLabelText}>{label}</Text>
            </View>
          ))}
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
                plan={weekPlan[dayIndex] ?? { breakfast: null, lunch: null, dinner: null }}
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
    </SafeAreaView>
  );
};

const MEAL_ROW_HEIGHT = 56 + 6; // slot height + margin
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
    width: 52,
    paddingLeft: theme.spacing.sm,
  },
  mealLabelHeader: {
    height: HEADER_HEIGHT,
  },
  mealLabelRow: {
    height: MEAL_ROW_HEIGHT,
    justifyContent: 'center',
  },
  mealLabelText: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  scrollContent: {
    paddingRight: theme.spacing.md,
  },
  loader: {
    flex: 1,
    alignSelf: 'center',
  },
});
