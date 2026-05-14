import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { theme } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';

const getStyles = (colors: any) => StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.md,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  imagePlaceholder: {
    width: '100%',
    height: 150,
    backgroundColor: colors.border,
  },
  content: {
    padding: theme.spacing.md,
  },
  titlePlaceholder: {
    width: '70%',
    height: 20,
    backgroundColor: colors.border,
    borderRadius: theme.borderRadius.sm,
    marginBottom: theme.spacing.sm,
  },
  subtitlePlaceholder: {
    width: '40%',
    height: 16,
    backgroundColor: colors.border,
    borderRadius: theme.borderRadius.sm,
    marginBottom: theme.spacing.md,
  },
  metaContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaPlaceholder: {
    width: 60,
    height: 16,
    backgroundColor: colors.border,
    borderRadius: theme.borderRadius.sm,
  },
});

export const SkeletonCard = () => {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const fadeAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, [fadeAnim]);

  return (
    <View style={styles.card}>
      <Animated.View style={[styles.imagePlaceholder, { opacity: fadeAnim }]} />
      <View style={styles.content}>
        <Animated.View style={[styles.titlePlaceholder, { opacity: fadeAnim }]} />
        <Animated.View style={[styles.subtitlePlaceholder, { opacity: fadeAnim }]} />
        <View style={styles.metaContainer}>
          <Animated.View style={[styles.metaPlaceholder, { opacity: fadeAnim }]} />
          <Animated.View style={[styles.metaPlaceholder, { opacity: fadeAnim }]} />
        </View>
      </View>
    </View>
  );
};
