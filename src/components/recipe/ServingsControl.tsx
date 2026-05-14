import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';

interface ServingsControlProps {
  servings: number;
  onIncrease: () => void;
  onDecrease: () => void;
}

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '600',
  },
  controlGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  button: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,107,107,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: colors.border,
  },
  valueContainer: {
    alignItems: 'center',
    minWidth: 70,
    paddingHorizontal: theme.spacing.sm,
  },
  valueText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
  },
  unitText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: -2,
  },
});

export const ServingsControl = ({ servings, onIncrease, onDecrease }: ServingsControlProps) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    fadeAnim.setValue(0.5);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [servings, fadeAnim]);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Rendimento:</Text>

      <View style={styles.controlGroup}>
        <TouchableOpacity
          style={[styles.button, servings <= 1 && styles.buttonDisabled]}
          onPress={onDecrease}
          disabled={servings <= 1}
        >
          <Feather name="minus" size={20} color={servings <= 1 ? colors.textSecondary : colors.primary} />
        </TouchableOpacity>

        <Animated.View style={[styles.valueContainer, { opacity: fadeAnim }]}>
          <Text style={styles.valueText}>{servings}</Text>
          <Text style={styles.unitText}>{servings === 1 ? 'porção' : 'porções'}</Text>
        </Animated.View>

        <TouchableOpacity
          style={[styles.button, servings >= 99 && styles.buttonDisabled]}
          onPress={onIncrease}
          disabled={servings >= 99}
        >
          <Feather name="plus" size={20} color={servings >= 99 ? colors.textSecondary : colors.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );
};
