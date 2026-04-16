import React, { useMemo, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, SectionList,
  StyleSheet, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import {
  loadSubstitutions, getAllTags,
  SubstitutionEntry,
} from '../../services/substitutionService';
import { SubstitutionModal } from '../../components/recipe/SubstitutionModal';

// ── Normalisation ──────────────────────────────────────────────────────────────

function normalize(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildSections(entries: SubstitutionEntry[]) {
  const grouped: Record<string, SubstitutionEntry[]> = {};
  for (const e of entries) {
    const letter = e.original[0].toUpperCase();
    if (!grouped[letter]) grouped[letter] = [];
    grouped[letter].push(e);
  }
  return Object.keys(grouped)
    .sort()
    .map(letter => ({ title: letter, data: grouped[letter] }));
}

// ── Tag colour map (mirrors SubstitutionModal) ─────────────────────────────────

const TAG_COLORS: Record<string, { bg: string; text: string }> = {
  'sem lactose': { bg: '#E3F2FD', text: '#1565C0' },
  'vegano':      { bg: '#E8F5E9', text: '#2E7D32' },
  'sem glúten':  { bg: '#FFF8E1', text: '#F57F17' },
  'sem ovo':     { bg: '#FCE4EC', text: '#880E4F' },
  'sem álcool':  { bg: '#F3E5F5', text: '#6A1B9A' },
};
const DEFAULT_TAG = { bg: '#F5F5F5', text: '#616161' };

// ── Screen ────────────────────────────────────────────────────────────────────

export const SubstitutionsScreen = () => {
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const allEntries = useMemo(() => loadSubstitutions(), []);
  const allTags = useMemo(() => getAllTags(), []);

  const [query, setQuery] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<SubstitutionEntry | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const filteredEntries = useMemo(() => {
    const normQuery = normalize(query);
    return allEntries.filter(e => {
      const matchQuery =
        !normQuery ||
        normalize(e.original).includes(normQuery) ||
        e.aliases.some(a => normalize(a).includes(normQuery));
      const matchTag = !activeTag || e.tags.includes(activeTag);
      return matchQuery && matchTag;
    });
  }, [allEntries, query, activeTag]);

  const sections = useMemo(() => buildSections(filteredEntries), [filteredEntries]);

  const openEntry = (entry: SubstitutionEntry) => {
    setSelectedEntry(entry);
    setModalVisible(true);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      {/* Search bar */}
      <View style={styles.searchRow}>
        <Feather name="search" size={16} color={colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar ingrediente…"
          placeholderTextColor={colors.textSecondary}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>

      {/* Tag filter chips */}
      <SectionList
        sections={sections}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.tagsRow}>
            <TouchableOpacity
              style={[styles.chip, !activeTag && styles.chipActive]}
              onPress={() => setActiveTag(null)}
            >
              <Text style={[styles.chipText, !activeTag && styles.chipTextActive]}>Todos</Text>
            </TouchableOpacity>
            {allTags.map(tag => {
              const isActive = activeTag === tag;
              const color = TAG_COLORS[tag] ?? DEFAULT_TAG;
              return (
                <TouchableOpacity
                  key={tag}
                  style={[
                    styles.chip,
                    isActive && { backgroundColor: color.bg, borderColor: color.text + '60' },
                  ]}
                  onPress={() => setActiveTag(isActive ? null : tag)}
                >
                  <Text style={[styles.chipText, isActive && { color: color.text, fontWeight: '700' }]}>
                    {tag}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        }
        renderSectionHeader={({ section: { title } }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeaderText}>{title}</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.item} onPress={() => openEntry(item)}>
            <View style={styles.itemLeft}>
              <View style={styles.swapIcon}>
                <Feather name="shuffle" size={14} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{item.original}</Text>
                <Text style={styles.itemCount} numberOfLines={1}>
                  {item.substitutes.length} substituto{item.substitutes.length !== 1 ? 's' : ''}
                </Text>
              </View>
            </View>
            <View style={styles.itemRight}>
              {item.tags.slice(0, 2).map(tag => {
                const color = TAG_COLORS[tag] ?? DEFAULT_TAG;
                return (
                  <View key={tag} style={[styles.miniTag, { backgroundColor: color.bg }]}>
                    <Text style={[styles.miniTagText, { color: color.text }]}>{tag}</Text>
                  </View>
                );
              })}
              <Feather name="chevron-right" size={16} color={colors.border} />
            </View>
          </TouchableOpacity>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="search" size={40} color={colors.border} />
            <Text style={styles.emptyText}>Nenhum ingrediente encontrado</Text>
          </View>
        }
        contentContainerStyle={sections.length === 0 ? { flex: 1 } : undefined}
      />

      <SubstitutionModal
        visible={modalVisible}
        entry={selectedEntry}
        ingredientName={selectedEntry?.original ?? ''}
        onClose={() => setModalVisible(false)}
      />
    </SafeAreaView>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────

const getStyles = (colors: any) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: theme.spacing.md,
    backgroundColor: colors.surface,
    borderRadius: theme.borderRadius.round,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: theme.spacing.md,
  },
  searchIcon: {
    marginRight: theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 15,
    color: colors.text,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.md,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.round,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.primary + '18',
    borderColor: colors.primary + '50',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
  chipTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  sectionHeader: {
    backgroundColor: colors.background,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: colors.background,
    justifyContent: 'space-between',
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: theme.spacing.md,
  },
  swapIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    textTransform: 'capitalize',
  },
  itemCount: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  itemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginLeft: theme.spacing.sm,
  },
  miniTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.round,
  },
  miniTagText: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: theme.spacing.lg + 32 + theme.spacing.md,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.md,
    paddingTop: 80,
  },
  emptyText: {
    fontSize: 15,
    color: colors.textSecondary,
  },
});
