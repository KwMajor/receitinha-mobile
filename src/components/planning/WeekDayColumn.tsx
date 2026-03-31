import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../constants/theme';
import { DayPlan, MealType } from '../../services/sqlite/planningService';
import { MealSlot } from './MealSlot';
import { Recipe } from '../../types';

const DAY_NAMES = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner'];

interface DraggingSlot {
  dayIndex: number;
  mealType: MealType;
  recipe: Recipe;
}

interface Props {
  dayIndex: number;
  date: Date;
  plan: DayPlan;
  draggingSlot: DraggingSlot | null;
  onSlotPress: (mealType: MealType) => void;
  onSlotLongPress: (mealType: MealType) => void;
  onRemove: (mealType: MealType) => void;
}

export const WeekDayColumn: React.FC<Props> = ({
  dayIndex,
  date,
  plan,
  draggingSlot,
  onSlotPress,
  onSlotLongPress,
  onRemove,
}) => {
  const isToday = (() => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  })();

  const isDragSource = (mealType: MealType) =>
    draggingSlot?.dayIndex === dayIndex && draggingSlot?.mealType === mealType;

  const isDropTarget = (mealType: MealType) =>
    draggingSlot !== null && !isDragSource(mealType);

  return (
    <View style={styles.column}>
      <View style={[styles.header, isToday && styles.headerToday]}>
        <Text style={[styles.dayName, isToday && styles.dayNameToday]}>
          {DAY_NAMES[dayIndex]}
        </Text>
        <Text style={[styles.dayNumber, isToday && styles.dayNumberToday]}>
          {date.getDate()}
        </Text>
      </View>

      {MEAL_TYPES.map((mealType) => (
        <MealSlot
          key={mealType}
          mealType={mealType}
          recipe={plan[mealType]}
          onPress={() => onSlotPress(mealType)}
          onLongPress={() => onSlotLongPress(mealType)}
          onRemove={() => onRemove(mealType)}
          isDropTarget={isDropTarget(mealType)}
          isDragging={isDragSource(mealType)}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  column: {
    width: 120,
    paddingHorizontal: 4,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 4,
    borderRadius: theme.borderRadius.md,
  },
  headerToday: {
    backgroundColor: theme.colors.primary + '15',
  },
  dayName: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
  },
  dayNameToday: {
    color: theme.colors.primary,
  },
  dayNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    marginTop: 2,
  },
  dayNumberToday: {
    color: theme.colors.primary,
  },
});
