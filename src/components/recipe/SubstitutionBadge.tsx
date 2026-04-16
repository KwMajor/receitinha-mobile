import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';

interface Props {
  ingredientName: string;
  onPress: () => void;
}

export const SubstitutionBadge: React.FC<Props> = ({ ingredientName, onPress }) => {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      style={[styles.badge, { backgroundColor: colors.primaryLight }]}
      onPress={onPress}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      accessibilityLabel={`Ver substituições para ${ingredientName}`}
      accessibilityRole="button"
    >
      <Feather name="shuffle" size={11} color={colors.primary} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  badge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
});
