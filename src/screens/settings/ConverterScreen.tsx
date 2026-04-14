import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import {
  ALL_UNITS,
  KNOWN_INGREDIENTS,
  QUICK_REFS,
  VOLUME_UNITS,
  WEIGHT_UNITS,
  convert,
  formatResult,
} from '../../utils/measureConverter';

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xxl,
    gap: theme.spacing.md,
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: -4,
  },
  convRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    flexWrap: 'nowrap',
  },
  qtyInput: {
    width: 64,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 10,
    fontSize: 16,
    textAlign: 'center',
    backgroundColor: colors.background,
    color: colors.text,
  },
  picker: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 10,
    backgroundColor: colors.background,
    gap: 4,
    minWidth: 0,
  },
  pickerText: {
    fontSize: 13,
    color: colors.text,
    flex: 1,
  },
  arrowWrap: {
    paddingHorizontal: 2,
  },
  resultBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '12',
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    flexWrap: 'wrap',
    gap: 2,
  },
  resultLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  resultValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
  },
  resultUnit: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  resultApprox: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  resultWarning: {
    fontSize: 13,
    color: colors.textSecondary,
    marginLeft: 6,
    flex: 1,
  },
  ingredientWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 8,
    backgroundColor: colors.background,
  },
  ingredientInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    padding: 0,
  },
  suggestionBox: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: theme.borderRadius.sm,
    overflow: 'hidden',
    marginTop: -theme.spacing.xs,
  },
  suggestionItem: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  suggestionText: {
    fontSize: 14,
    color: colors.text,
  },
  accordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  accordionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  accordionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  accordionBody: {
    marginTop: theme.spacing.sm,
    gap: 2,
  },
  refRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  refLabel: {
    fontSize: 13,
    color: colors.text,
    flex: 1,
  },
  refDivider: {
    width: 1,
    height: 14,
    backgroundColor: colors.border,
    marginHorizontal: theme.spacing.sm,
  },
  refValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.primary,
    width: 80,
    textAlign: 'right',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '55%',
    paddingBottom: 24,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
  },
  modalItemActive: {
    backgroundColor: colors.primary + '10',
  },
  modalItemText: {
    fontSize: 16,
    color: colors.text,
  },
  modalItemTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
});

// ── Unit Picker ───────────────────────────────────────────────────────────

interface UnitPickerProps {
  value: string;
  options: string[];
  onChange: (v: string) => void;
}

const UnitPicker = ({ value, options, onChange }: UnitPickerProps) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const [open, setOpen] = useState(false);
  const label = ALL_UNITS[value]?.label ?? value;

  return (
    <>
      <TouchableOpacity style={styles.picker} onPress={() => setOpen(true)}>
        <Text style={styles.pickerText} numberOfLines={1}>{label}</Text>
        <Feather name="chevron-down" size={14} color={colors.textSecondary} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Selecionar unidade</Text>
            <FlatList
              data={options}
              keyExtractor={k => k}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.modalItem, item === value && styles.modalItemActive]}
                  onPress={() => { onChange(item); setOpen(false); }}
                >
                  <Text style={[styles.modalItemText, item === value && styles.modalItemTextActive]}>
                    {ALL_UNITS[item]?.label ?? item}
                  </Text>
                  {item === value && <Feather name="check" size={16} color={colors.primary} />}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

// ── Result display ────────────────────────────────────────────────────────

const ResultRow = ({
  result,
  toUnit,
  approximate,
  warning,
}: {
  result: number | null;
  toUnit: string;
  approximate?: boolean;
  warning?: string;
}) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);

  if (warning) {
    return (
      <View style={styles.resultBox}>
        <Feather name="alert-circle" size={14} color={colors.textSecondary} />
        <Text style={styles.resultWarning}>{warning}</Text>
      </View>
    );
  }
  if (result === null) return null;
  return (
    <View style={styles.resultBox}>
      <Text style={styles.resultLabel}>Resultado: </Text>
      <Text style={styles.resultValue}>{formatResult(result)}</Text>
      <Text style={styles.resultUnit}> {ALL_UNITS[toUnit]?.label ?? toUnit}</Text>
      {approximate && <Text style={styles.resultApprox}> (aprox.)</Text>}
    </View>
  );
};

// ── Converter Section ─────────────────────────────────────────────────────

const VOLUME_KEYS = Object.keys(VOLUME_UNITS);
const WEIGHT_KEYS = Object.keys(WEIGHT_UNITS);
const ALL_CONV_KEYS = [...VOLUME_KEYS, ...WEIGHT_KEYS];

interface ConvSectionProps {
  title: string;
  unitOptions: string[];
  qty: string;
  setQty: (v: string) => void;
  from: string;
  setFrom: (v: string) => void;
  to: string;
  setTo: (v: string) => void;
}

const ConvSection = ({
  title,
  unitOptions,
  qty,
  setQty,
  from,
  setFrom,
  to,
  setTo,
}: ConvSectionProps) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const result = useMemo(() => {
    const n = parseFloat(qty.replace(',', '.'));
    if (!n || isNaN(n)) return null;
    return convert(n, from, to);
  }, [qty, from, to]);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>

      <View style={styles.convRow}>
        <TextInput
          style={styles.qtyInput}
          value={qty}
          onChangeText={v => setQty(v.replace(/[^0-9.,]/g, ''))}
          keyboardType="decimal-pad"
          placeholder="0"
          placeholderTextColor={colors.textSecondary}
        />
        <UnitPicker value={from} options={unitOptions} onChange={setFrom} />
        <View style={styles.arrowWrap}>
          <Feather name="arrow-right" size={18} color={colors.textSecondary} />
        </View>
        <UnitPicker value={to} options={unitOptions} onChange={setTo} />
      </View>

      <ResultRow result={result} toUnit={to} />
    </View>
  );
};

// ── Contextual Section ────────────────────────────────────────────────────

const ContextualSection = () => {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const [qty, setQty] = useState('1');
  const [from, setFrom] = useState('xícara');
  const [to, setTo] = useState('g');
  const [ingredient, setIngredient] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const needsCross =
    ALL_UNITS[from]?.group !== ALL_UNITS[to]?.group &&
    ALL_UNITS[from]?.group !== 'contextual' &&
    ALL_UNITS[to]?.group !== 'contextual';

  const result = useMemo(() => {
    const n = parseFloat(qty.replace(',', '.'));
    if (!n || isNaN(n)) return null;
    return convert(n, from, to, ingredient);
  }, [qty, from, to, ingredient]);

  const showWarning =
    needsCross && !ingredient.trim()
      ? 'Informe o ingrediente para esta conversão'
      : needsCross && result === null && ingredient.trim()
      ? 'Ingrediente não encontrado na tabela de densidades'
      : undefined;

  const handleIngredientChange = (text: string) => {
    setIngredient(text);
    if (text.length < 2) { setSuggestions([]); return; }
    const norm = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    setSuggestions(
      KNOWN_INGREDIENTS.filter(i =>
        i.normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(norm),
      ).slice(0, 5),
    );
  };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Conversão contextual</Text>
      <Text style={styles.sectionSubtitle}>
        Volume ↔ Peso (requer informar o ingrediente)
      </Text>

      <View style={styles.convRow}>
        <TextInput
          style={styles.qtyInput}
          value={qty}
          onChangeText={v => setQty(v.replace(/[^0-9.,]/g, ''))}
          keyboardType="decimal-pad"
          placeholder="0"
          placeholderTextColor={colors.textSecondary}
        />
        <UnitPicker value={from} options={ALL_CONV_KEYS} onChange={setFrom} />
        <View style={styles.arrowWrap}>
          <Feather name="arrow-right" size={18} color={colors.textSecondary} />
        </View>
        <UnitPicker value={to} options={ALL_CONV_KEYS} onChange={setTo} />
      </View>

      <View style={styles.ingredientWrapper}>
        <Feather name="search" size={14} color={colors.textSecondary} style={{ marginRight: 6 }} />
        <TextInput
          style={styles.ingredientInput}
          value={ingredient}
          onChangeText={handleIngredientChange}
          placeholder="Ingrediente (opcional)"
          placeholderTextColor={colors.textSecondary}
          autoCapitalize="none"
        />
        {ingredient.length > 0 && (
          <TouchableOpacity onPress={() => { setIngredient(''); setSuggestions([]); }}>
            <Feather name="x" size={14} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {suggestions.length > 0 && (
        <View style={styles.suggestionBox}>
          {suggestions.map(s => (
            <TouchableOpacity
              key={s}
              style={styles.suggestionItem}
              onPress={() => { setIngredient(s); setSuggestions([]); }}
            >
              <Text style={styles.suggestionText}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <ResultRow
        result={result}
        toUnit={to}
        approximate={needsCross}
        warning={showWarning}
      />
    </View>
  );
};

// ── Quick Reference Accordion ─────────────────────────────────────────────

const QuickRefAccordion = () => {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.section}>
      <TouchableOpacity style={styles.accordionHeader} onPress={() => setOpen(v => !v)}>
        <View style={styles.accordionHeaderLeft}>
          <Feather name="book-open" size={16} color={colors.primary} />
          <Text style={styles.accordionTitle}>Tabela de referência rápida</Text>
        </View>
        <Feather name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textSecondary} />
      </TouchableOpacity>

      {open && (
        <View style={styles.accordionBody}>
          {QUICK_REFS.map(ref => (
            <View key={ref.label} style={styles.refRow}>
              <Text style={styles.refLabel}>{ref.label}</Text>
              <View style={styles.refDivider} />
              <Text style={styles.refValue}>{ref.value}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

// ── Screen ────────────────────────────────────────────────────────────────

export const ConverterScreen = () => {
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const [volQty, setVolQty] = useState('1');
  const [volFrom, setVolFrom] = useState('xícara');
  const [volTo, setVolTo] = useState('ml');

  const [wgtQty, setWgtQty] = useState('1');
  const [wgtFrom, setWgtFrom] = useState('kg');
  const [wgtTo, setWgtTo] = useState('g');

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <ConvSection
        title="Volume"
        unitOptions={VOLUME_KEYS}
        qty={volQty}
        setQty={setVolQty}
        from={volFrom}
        setFrom={setVolFrom}
        to={volTo}
        setTo={setVolTo}
      />

      <ConvSection
        title="Peso"
        unitOptions={WEIGHT_KEYS}
        qty={wgtQty}
        setQty={setWgtQty}
        from={wgtFrom}
        setFrom={setWgtFrom}
        to={wgtTo}
        setTo={setWgtTo}
      />

      <ContextualSection />

      <QuickRefAccordion />
    </ScrollView>
  );
};
