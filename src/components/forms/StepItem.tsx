import React from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../constants/theme';

interface StepItemProps {
  order: number;
  instruction: string;
  timerMinutes?: string;
  onChangeInstruction: (val: string) => void;
  onChangeTimer: (val: string) => void;
  onRemove: () => void;
  drag?: () => void; // Apenas placeholder para a prop do hook de reordenação se usar depois
}

export const StepItem = ({
  order, instruction, timerMinutes, onChangeInstruction, onChangeTimer, onRemove, drag
}: StepItemProps) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity onPressIn={drag} style={styles.dragHandle}>
        <Feather name="menu" size={20} color={theme.colors.textSecondary} />
      </TouchableOpacity>

      <View style={styles.badge}>
        <Text style={styles.badgeText}>{order}</Text>
      </View>

      <View style={styles.content}>
        <TextInput
          style={styles.instructionInput}
          multiline
          placeholder="Descreva o passo a passo..."
          value={instruction}
          onChangeText={onChangeInstruction}
        />
        
        <View style={styles.timerContainer}>
          <Feather name="clock" size={16} color={theme.colors.textSecondary} style={{ marginRight: 4 }} />
          <TextInput
            style={styles.timerInput}
            placeholder="Timer (min)"
            keyboardType="numeric"
            value={timerMinutes}
            onChangeText={onChangeTimer}
            returnKeyType="done"
          />
        </View>
      </View>

      <TouchableOpacity onPress={onRemove} style={styles.removeBtn}>
        <Feather name="x" size={20} color={theme.colors.error} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  dragHandle: {
    padding: theme.spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  badge: {
    backgroundColor: theme.colors.primary,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: theme.spacing.xs,
    marginTop: 6,
  },
  badgeText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  content: {
    flex: 1,
    gap: theme.spacing.sm,
  },
  instructionInput: {
    minHeight: 60,
    backgroundColor: '#fff',
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    textAlignVertical: 'top',
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timerInput: {
    flex: 1,
    height: 40,
    backgroundColor: '#fff',
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  removeBtn: {
    padding: theme.spacing.xs,
    marginTop: 8,
  }
});
