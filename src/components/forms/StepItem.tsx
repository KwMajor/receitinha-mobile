import React from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';

interface StepItemProps {
  order: number;
  instruction: string;
  timerMinutes?: string;
  onChangeInstruction: (val: string) => void;
  onChangeTimer: (val: string) => void;
  onRemove: () => void;
  timerError?: string;
  drag?: () => void;
  onFocus?: () => void;
}

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.md,
    backgroundColor: colors.surface,
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
    backgroundColor: colors.primary,
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
    backgroundColor: colors.background,
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    textAlignVertical: 'top',
    color: colors.text,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timerInput: {
    flex: 1,
    height: 40,
    backgroundColor: colors.background,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
  },
  timerInputError: {
    borderColor: colors.error,
  },
  timerErrorText: {
    fontSize: 12,
    color: colors.error,
    marginTop: 2,
  },
  removeBtn: {
    padding: theme.spacing.xs,
    marginTop: 8,
  }
});

export const StepItem = ({
  order, instruction, timerMinutes, onChangeInstruction, onChangeTimer, onRemove, timerError, drag, onFocus
}: StepItemProps) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);

  return (
    <View style={styles.container}>
      <TouchableOpacity onPressIn={drag} style={styles.dragHandle}>
        <Feather name="menu" size={20} color={colors.textSecondary} />
      </TouchableOpacity>

      <View style={styles.badge}>
        <Text style={styles.badgeText}>{order}</Text>
      </View>

      <View style={styles.content}>
        <TextInput
          style={styles.instructionInput}
          multiline
          placeholder="Descreva o passo a passo..."
          placeholderTextColor={colors.textSecondary}
          value={instruction}
          onChangeText={onChangeInstruction}
          onFocus={onFocus}
        />

        <View style={styles.timerContainer}>
          <Feather name="clock" size={16} color={timerError ? colors.error : colors.textSecondary} style={{ marginRight: 4 }} />
          <TextInput
            style={[styles.timerInput, timerError ? styles.timerInputError : null]}
            placeholder="Tempo (min) *"
            placeholderTextColor={colors.textSecondary}
            keyboardType="numeric"
            value={timerMinutes}
            onChangeText={v => onChangeTimer(v.replace(/[^0-9]/g, ''))}
            returnKeyType="done"
          />
        </View>
        {timerError && <Text style={styles.timerErrorText}>{timerError}</Text>}
      </View>

      <TouchableOpacity onPress={onRemove} style={styles.removeBtn}>
        <Feather name="x" size={20} color={colors.error} />
      </TouchableOpacity>
    </View>
  );
};
