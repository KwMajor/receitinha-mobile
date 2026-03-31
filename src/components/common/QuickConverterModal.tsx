import React, { useMemo, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import {
  ALL_UNITS,
  KNOWN_INGREDIENTS,
  VOLUME_UNITS,
  WEIGHT_UNITS,
  convert,
  formatResult,
} from '../../utils/measureConverter';

const VOLUME_KEYS = Object.keys(VOLUME_UNITS);
const WEIGHT_KEYS = Object.keys(WEIGHT_UNITS);
const ALL_CONV_KEYS = [...VOLUME_KEYS, ...WEIGHT_KEYS];

interface Props {
  visible: boolean;
  /** Unidade atual do ingrediente no formulário */
  initialUnit?: string;
  /** Nome do ingrediente atual (pré-preenche o campo de ingrediente) */
  ingredientName?: string;
  onClose: () => void;
  /** Chamado quando o usuário toca "Usar este valor" */
  onUse: (quantity: string, unit: string) => void;
}

// ── Mini UnitPicker inline ─────────────────────────────────────────────────

function InlineUnitPicker({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <TouchableOpacity style={styles.picker} onPress={() => setOpen(true)}>
        <Text style={styles.pickerText} numberOfLines={1}>
          {ALL_UNITS[value]?.label ?? value}
        </Text>
        <Feather name="chevron-down" size={12} color={theme.colors.textSecondary} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity
          style={styles.pickerBackdrop}
          activeOpacity={1}
          onPress={() => setOpen(false)}
        >
          <View style={styles.pickerSheet}>
            <Text style={styles.pickerSheetTitle}>Unidade</Text>
            <FlatList
              data={options}
              keyExtractor={k => k}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.pickerItem, item === value && styles.pickerItemActive]}
                  onPress={() => { onChange(item); setOpen(false); }}
                >
                  <Text style={[styles.pickerItemText, item === value && styles.pickerItemTextActive]}>
                    {ALL_UNITS[item]?.label ?? item}
                  </Text>
                  {item === value && (
                    <Feather name="check" size={14} color={theme.colors.primary} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

// ── Main Modal ─────────────────────────────────────────────────────────────

export const QuickConverterModal = ({
  visible,
  initialUnit,
  ingredientName = '',
  onClose,
  onUse,
}: Props) => {
  // Detect the unit group of the incoming unit to pre-select reasonable defaults
  const initGroup = initialUnit ? ALL_UNITS[initialUnit]?.group : undefined;
  const defaultFrom = initialUnit && ALL_UNITS[initialUnit] ? initialUnit : 'xícara';
  const defaultTo = initGroup === 'weight' ? 'g' : initGroup === 'volume' ? 'ml' : 'g';

  const [qty, setQty] = useState('1');
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [ingredient, setIngredient] = useState(ingredientName);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  // Reset state when modal opens
  React.useEffect(() => {
    if (visible) {
      setQty('1');
      setFrom(initialUnit && ALL_UNITS[initialUnit] ? initialUnit : 'xícara');
      setTo(initGroup === 'weight' ? 'g' : 'ml');
      setIngredient(ingredientName);
      setSuggestions([]);
    }
  }, [visible]);

  const fromGroup = ALL_UNITS[from]?.group;
  const toGroup = ALL_UNITS[to]?.group;
  const isCrossGroup = fromGroup !== toGroup && fromGroup !== 'contextual' && toGroup !== 'contextual';

  const result = useMemo(() => {
    const n = parseFloat(qty.replace(',', '.'));
    if (!n || isNaN(n)) return null;
    return convert(n, from, to, ingredient);
  }, [qty, from, to, ingredient]);

  const warning =
    isCrossGroup && !ingredient.trim()
      ? 'Informe o ingrediente'
      : isCrossGroup && result === null && ingredient.trim()
      ? 'Ingrediente não encontrado'
      : undefined;

  const handleIngredientChange = (text: string) => {
    setIngredient(text);
    if (text.length < 2) { setSuggestions([]); return; }
    const norm = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    setSuggestions(
      KNOWN_INGREDIENTS.filter(i =>
        i.normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(norm),
      ).slice(0, 4),
    );
  };

  const handleUse = () => {
    if (result === null) return;
    onUse(formatResult(result), to);
  };

  // Determine which units to show based on the from unit group
  const fromOptions = ALL_CONV_KEYS;
  const toOptions = ALL_CONV_KEYS;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>

      <KeyboardAvoidingView
        style={styles.kvWrapper}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        pointerEvents="box-none"
      >
        <View style={styles.sheet}>
          {/* Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Feather name="repeat" size={16} color={theme.colors.primary} />
              <Text style={styles.title}>Conversor rápido</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="x" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Conversion row */}
          <View style={styles.convRow}>
            <TextInput
              style={styles.qtyInput}
              value={qty}
              onChangeText={v => setQty(v.replace(/[^0-9.,]/g, ''))}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={theme.colors.textSecondary}
              selectTextOnFocus
            />
            <InlineUnitPicker value={from} options={fromOptions} onChange={setFrom} />
            <View style={styles.arrow}>
              <Feather name="arrow-right" size={16} color={theme.colors.textSecondary} />
            </View>
            <InlineUnitPicker value={to} options={toOptions} onChange={setTo} />
          </View>

          {/* Ingredient (only shown for cross-group or always) */}
          <View style={styles.ingredientRow}>
            <Feather name="search" size={13} color={theme.colors.textSecondary} />
            <TextInput
              style={styles.ingredientInput}
              value={ingredient}
              onChangeText={handleIngredientChange}
              placeholder="Ingrediente (para volume↔peso)"
              placeholderTextColor={theme.colors.textSecondary}
              autoCapitalize="none"
            />
            {ingredient.length > 0 && (
              <TouchableOpacity onPress={() => { setIngredient(''); setSuggestions([]); }}>
                <Feather name="x" size={13} color={theme.colors.textSecondary} />
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

          {/* Result */}
          {warning ? (
            <View style={styles.warningBox}>
              <Feather name="alert-circle" size={13} color={theme.colors.secondary} />
              <Text style={styles.warningText}>{warning}</Text>
            </View>
          ) : result !== null ? (
            <View style={styles.resultBox}>
              <Text style={styles.resultText}>
                {formatResult(result)}{' '}
                <Text style={styles.resultUnit}>{ALL_UNITS[to]?.label ?? to}</Text>
              </Text>
              {isCrossGroup && (
                <Text style={styles.approxNote}>valor aproximado</Text>
              )}
            </View>
          ) : null}

          {/* Action buttons */}
          <View style={styles.buttons}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.useBtn, result === null && styles.useBtnDisabled]}
              onPress={handleUse}
              disabled={result === null}
            >
              <Feather name="check" size={16} color="#fff" />
              <Text style={styles.useText}>Usar este valor</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  kvWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: theme.spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 36 : theme.spacing.lg,
    gap: theme.spacing.md,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.border,
    alignSelf: 'center',
    marginBottom: theme.spacing.xs,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  title: {
    fontSize: 17,
    fontWeight: 'bold',
    color: theme.colors.text,
  },

  // Conv row
  convRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  qtyInput: {
    width: 68,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 10,
    fontSize: 17,
    textAlign: 'center',
    color: theme.colors.text,
    backgroundColor: theme.colors.surface,
  },
  picker: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 10,
    backgroundColor: theme.colors.surface,
    gap: 4,
    minWidth: 0,
  },
  pickerText: {
    fontSize: 13,
    color: theme.colors.text,
    flex: 1,
  },
  arrow: {
    paddingHorizontal: 2,
  },

  // Ingredient
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 9,
    backgroundColor: theme.colors.surface,
    gap: 6,
  },
  ingredientInput: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text,
    padding: 0,
  },
  suggestionBox: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    overflow: 'hidden',
    marginTop: -theme.spacing.sm,
  },
  suggestionItem: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  suggestionText: {
    fontSize: 14,
    color: theme.colors.text,
  },

  // Result
  resultBox: {
    backgroundColor: theme.colors.primary + '12',
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
  },
  resultText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  resultUnit: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  approxNote: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 2,
  },

  // Warning
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.secondary + '18',
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  warningText: {
    fontSize: 13,
    color: theme.colors.secondary,
  },

  // Buttons
  buttons: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  useBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary,
  },
  useBtnDisabled: {
    opacity: 0.45,
  },
  useText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#fff',
  },

  // Inner picker modal
  pickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '50%',
    paddingBottom: 24,
  },
  pickerSheetTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: theme.colors.text,
    textAlign: 'center',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surface,
  },
  pickerItemActive: {
    backgroundColor: theme.colors.primary + '10',
  },
  pickerItemText: {
    fontSize: 15,
    color: theme.colors.text,
  },
  pickerItemTextActive: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
});
