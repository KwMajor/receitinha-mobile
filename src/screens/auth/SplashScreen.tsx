import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { theme } from '../../constants/theme';

export const SplashScreen = () => {
  return (
    <View style={styles.container}>
      {/* Aqui iria o Logo do App */}
      <Text style={styles.logoText}>RECEITINHA</Text>
      <ActivityIndicator size="large" color={theme.colors.primary} />
      <Text style={styles.text}>Verificando sessão...</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: theme.spacing.xl,
  },
  text: {
    marginTop: theme.spacing.md,
    color: theme.colors.textSecondary,
    fontSize: 16,
  }
});
