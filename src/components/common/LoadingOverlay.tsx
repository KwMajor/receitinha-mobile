import React from 'react';
import { View, ActivityIndicator, StyleSheet, Modal } from 'react-native';
import { theme } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';

interface LoadingOverlayProps {
  visible?: boolean;
}

const getStyles = (colors: any) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  spinnerContainer: {
    padding: theme.spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: theme.borderRadius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  }
});

export const LoadingOverlay = ({ visible = false }: LoadingOverlayProps) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);

  if (!visible) return null;

  return (
    <Modal transparent animationType="fade" visible={visible}>
      <View style={styles.overlay}>
        <View style={styles.spinnerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    </Modal>
  );
};
