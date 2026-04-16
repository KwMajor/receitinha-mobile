import React from 'react';
import {
  Modal, View, Text, TouchableOpacity, ScrollView,
  StyleSheet, Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { SubstitutionEntry } from '../../services/substitutionService';

interface Props {
  visible: boolean;
  entry: SubstitutionEntry | null;
  ingredientName: string;
  onClose: () => void;
}

// Tag colour map — add more as needed
const TAG_COLORS: Record<string, { bg: string; text: string }> = {
  'sem lactose': { bg: '#E3F2FD', text: '#1565C0' },
  'vegano':      { bg: '#E8F5E9', text: '#2E7D32' },
  'sem glúten':  { bg: '#FFF8E1', text: '#F57F17' },
  'sem ovo':     { bg: '#FCE4EC', text: '#880E4F' },
  'sem álcool':  { bg: '#F3E5F5', text: '#6A1B9A' },
};

const DEFAULT_TAG = { bg: '#F5F5F5', text: '#616161' };

export const SubstitutionModal: React.FC<Props> = ({
  visible,
  entry,
  ingredientName,
  onClose,
}) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);

  if (!entry) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity activeOpacity={1} style={styles.sheet} onPress={() => {}}>
          {/* Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerLabel}>Substituições para</Text>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {ingredientName}
              </Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Feather name="x" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Tags */}
          {entry.tags.length > 0 && (
            <View style={styles.tagsRow}>
              {entry.tags.map(tag => {
                const color = TAG_COLORS[tag] ?? DEFAULT_TAG;
                return (
                  <View key={tag} style={[styles.tag, { backgroundColor: color.bg }]}>
                    <Text style={[styles.tagText, { color: color.text }]}>{tag}</Text>
                  </View>
                );
              })}
            </View>
          )}

          {/* Substitutes list */}
          <ScrollView
            style={styles.list}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          >
            {entry.substitutes.map((sub, index) => (
              <View key={index} style={styles.card}>
                {/* Substitute name + ratio */}
                <View style={styles.cardHeader}>
                  <View style={styles.swapIcon}>
                    <Feather name="shuffle" size={14} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.substituteName}>{sub.name}</Text>
                  </View>
                  <View style={styles.ratioBadge}>
                    <Text style={styles.ratioText}>{sub.ratio}</Text>
                  </View>
                </View>
                {/* Notes */}
                <Text style={styles.notes}>{sub.notes}</Text>
              </View>
            ))}

            <Text style={styles.disclaimer}>
              Os resultados podem variar conforme a receita. Ajuste temperos e quantidades ao gosto.
            </Text>
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const getStyles = (colors: any) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: theme.spacing.sm,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '80%',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: theme.spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  headerLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.round,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  list: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  listContent: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: theme.spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  swapIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  substituteName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  ratioBadge: {
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.borderRadius.round,
  },
  ratioText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  notes: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginLeft: 36,
  },
  disclaimer: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: theme.spacing.sm,
    lineHeight: 16,
  },
});
