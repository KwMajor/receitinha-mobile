import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../constants/theme';
import { MealSlotConfig } from '../../services/sqlite/planningService';
import { MealSlot } from './MealSlot';
import { Recipe } from '../../types';

const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

interface DraggingSlot {
  dayIndex: number;
  mealType: string;
  recipe: Recipe;
}

interface Props {
  dayIndex: number;
  date: Date;
  plan: { [mealType: string]: Recipe | null };
  mealSlots: MealSlotConfig[];
  draggingSlot: DraggingSlot | null;
  onSlotPress: (mealType: string) => void;
  onSlotLongPress: (mealType: string) => void;
  onRemove: (mealType: string) => void;
}

export const WeekDayColumn: React.FC<Props> = ({
  dayIndex,
  date,
  plan,
  mealSlots,
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

  const isDragSource = (mealType: string) =>
    draggingSlot?.dayIndex === dayIndex && draggingSlot?.mealType === mealType;

  const isDropTarget = (mealType: string) =>
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

      {mealSlots.map((slot) => (
        <MealSlot
          key={slot.mealType}
          label={slot.label}
          recipe={plan[slot.mealType] ?? null}
          onPress={() => onSlotPress(slot.mealType)}
          onLongPress={() => onSlotLongPress(slot.mealType)}
          onRemove={() => onRemove(slot.mealType)}
          isDropTarget={isDropTarget(slot.mealType)}
          isDragging={isDragSource(slot.mealType)}
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
