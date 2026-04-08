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
  timerError?: string;
  drag?: () => void;
}

export const StepItem = ({
  order, instruction, timerMinutes, onChangeInstruction, onChangeTimer, onRemove, timerError, drag
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
          <Feather name="clock" size={16} color={timerError ? theme.colors.error : theme.colors.textSecondary} style={{ marginRight: 4 }} />
          <TextInput
            style={[styles.timerInput, timerError ? styles.timerInputError : null]}
            placeholder="Tempo (min) *"
            keyboardType="numeric"
            value={timerMinutes}
            onChangeText={v => onChangeTimer(v.replace(/[^0-9]/g, ''))}
            returnKeyType="done"
          />
        </View>
        {timerError && <Text style={styles.timerErrorText}>{timerError}</Text>}
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
  timerInputError: {
    borderColor: theme.colors.error,
  },
  timerErrorText: {
    fontSize: 12,
    color: theme.colors.error,
    marginTop: 2,
  },
  removeBtn: {
    padding: theme.spacing.xs,
    marginTop: 8,
  }
});
