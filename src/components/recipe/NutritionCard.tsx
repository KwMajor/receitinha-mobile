import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { NutritionInfo } from '../../services/nutritionService';

interface Props {
  nutrition: NutritionInfo | null;
  isLoading: boolean;
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

const SkeletonBox: React.FC<{ width?: number | string; height?: number; colors: any }> = ({
  width = '100%',
  height = 20,
  colors,
}) => {
  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [pulse]);

  return (
    <Animated.View
      style={[
        { backgroundColor: colors.border, borderRadius: theme.borderRadius.sm },
        { width: width as any, height, opacity: pulse },
      ]}
    />
  );
};

// ── Macro card ────────────────────────────────────────────────────────────────

interface MacroCardProps {
  icon: React.ComponentProps<typeof Feather>['name'];
  label: string;
  value: string;
  unit: string;
  color: string;
  colors: any;
}

const getMacroStyles = (colors: any) => StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: 12,
    alignItems: 'center',
    gap: 2,
    borderTopWidth: 3,
  },
  value: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginTop: 4,
  },
  unit: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
    marginTop: -2,
  },
  label: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 2,
  },
});

const MacroCard: React.FC<MacroCardProps> = ({ icon, label, value, unit, color, colors }) => {
  const macroStyles = getMacroStyles(colors);
  return (
    <View style={[macroStyles.card, { borderTopColor: color }]}>
      <Feather name={icon} size={16} color={color} />
      <Text style={macroStyles.value}>{value}</Text>
      <Text style={macroStyles.unit}>{unit}</Text>
      <Text style={macroStyles.label}>{label}</Text>
    </View>
  );
};

// ── Main component ────────────────────────────────────────────────────────────

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  perServing: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  fiberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  fiberLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  fiberValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  warningText: {
    fontSize: 11,
    color: colors.textSecondary,
    flex: 1,
  },
});

export const NutritionCard: React.FC<Props> = ({ nutrition, isLoading }) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const macroStyles = getMacroStyles(colors);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <SkeletonBox width={160} height={16} colors={colors} />
          <SkeletonBox width={64} height={12} colors={colors} />
        </View>
        <View style={styles.grid}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={[macroStyles.card, { borderTopColor: colors.border }]}>
              <SkeletonBox width={24} height={16} colors={colors} />
              <SkeletonBox width={40} height={20} colors={colors} />
              <SkeletonBox width={20} height={12} colors={colors} />
              <SkeletonBox width={56} height={12} colors={colors} />
            </View>
          ))}
        </View>
        <SkeletonBox width={100} height={12} colors={colors} />
      </View>
    );
  }

  if (!nutrition) return null;

  const fmt = (n: number) => {
    if (n < 10) return n.toFixed(1);
    return Math.round(n).toString();
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>Informações Nutricionais</Text>
        <Text style={styles.perServing}>por porção</Text>
      </View>

      <View style={styles.grid}>
        <MacroCard icon="zap" label="Calorias" value={fmt(nutrition.kcal)} unit="kcal" color="#FF6C37" colors={colors} />
        <MacroCard icon="trending-up" label="Proteínas" value={fmt(nutrition.protein)} unit="g" color="#4A90E2" colors={colors} />
        <MacroCard icon="layers" label="Carboidratos" value={fmt(nutrition.carbs)} unit="g" color="#F5A623" colors={colors} />
        <MacroCard icon="droplet" label="Gorduras" value={fmt(nutrition.fat)} unit="g" color="#7ED321" colors={colors} />
      </View>

      <View style={styles.fiberRow}>
        <Text style={styles.fiberLabel}>Fibras</Text>
        <Text style={styles.fiberValue}>{fmt(nutrition.fiber)} g</Text>
      </View>

      {nutrition.coveredCount < nutrition.totalCount && (
        <View style={styles.warningRow}>
          <Feather name="info" size={12} color={colors.textSecondary} />
          <Text style={styles.warningText}>
            Baseado em {nutrition.coveredCount} de {nutrition.totalCount} ingredientes identificados
          </Text>
        </View>
      )}
    </View>
  );
};
