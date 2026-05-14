import React, { useState, useRef } from 'react';
import {
  Alert, Modal, View, Text, TextInput, TouchableOpacity,
  StyleSheet, Platform, Animated, ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import RecipeForm from '../../components/recipe/RecipeForm';
import { createRecipe, CreateRecipeInput } from '../../services/sqlite/recipeService';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../services/api/client';
import { theme } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';

// ── Types ─────────────────────────────────────────────────────────────────────

interface RecipeImport {
  title: string;
  ingredients: string[];
  steps: string[];
  servings?: number | null;
  prepTime?: number | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseFraction(str: string): number {
  const s = str.replace(/\s/g, '');
  if (s.includes('/')) {
    const [num, den] = s.split('/');
    return parseFloat(num) / parseFloat(den);
  }
  return parseFloat(s.replace(',', '.'));
}

function formatQty(qty: number): string {
  if (!isFinite(qty) || qty <= 0) return '1';
  const rounded = Math.round(qty * 100) / 100;
  // Use comma as decimal separator (matches EditRecipeScreen convention)
  return rounded.toString().replace('.', ',');
}

/**
 * Parses a raw ingredient string (from JSON-LD scraping) into the three
 * fields expected by RecipeForm: quantity, unit, name.
 *
 * Handles patterns like:
 *   "2 xícaras de farinha de trigo"  → {qty:"2",  unit:"xícaras",      name:"farinha de trigo"}
 *   "1/2 xícara de óleo"             → {qty:"0,5", unit:"xícara",       name:"óleo"}
 *   "3 ovos"                         → {qty:"3",  unit:"",              name:"ovos"}
 *   "200g de chocolate"              → {qty:"200", unit:"g",            name:"chocolate"}
 *   "1 colher (sopa) de manteiga"    → {qty:"1",  unit:"colher (sopa)", name:"manteiga"}
 *   "sal a gosto"                    → {qty:"1",  unit:"",              name:"sal a gosto"}
 */
function parseIngredient(raw: string): { quantity: string; unit: string; name: string } {
  const trimmed = raw.trim();

  // Capture leading number (integer, decimal, fraction) + possible attached unit abbreviation
  // e.g. "200g de farinha" → num="200", attached="g", rest="de farinha"
  // e.g. "2 xícaras de farinha" → num="2", attached="", rest="xícaras de farinha"
  const numRe = /^(\d+(?:[.,]\d+)?(?:\s*\/\s*\d+(?:[.,]\d+)?)?)([a-zA-Z]*)(\s+.*|$)/;
  const m = trimmed.match(numRe);

  if (!m || !m[1]) {
    // No leading number → whole string is the ingredient name
    return { quantity: '1', unit: '', name: trimmed };
  }

  const qty = parseFraction(m[1]);
  const attached = m[2].trim();   // unit glued to number ("g", "kg", "ml", "L")
  const rest = m[3].trim();       // everything after number+attached

  // Unit was attached directly to the number (e.g. "200g")
  if (attached) {
    const name = rest.replace(/^de\s+/i, '').trim();
    return { quantity: formatQty(qty), unit: attached, name: name || trimmed };
  }

  if (!rest) {
    // Just a bare number (unusual); fall back to original string as name
    return { quantity: formatQty(qty), unit: '', name: trimmed };
  }

  // Look for "de" as separator between unit phrase and ingredient name
  // "2 xícaras de farinha de trigo" → unit="xícaras", name="farinha de trigo"
  // "1 colher (sopa) de manteiga"   → unit="colher (sopa)", name="manteiga"
  const deMatch = rest.match(/^(.+?)\s+de\s+(.+)$/i);
  if (deMatch) {
    return {
      quantity: formatQty(qty),
      unit: deMatch[1].trim(),
      name: deMatch[2].trim(),
    };
  }

  // No "de" found → the rest is purely the ingredient name
  // "3 ovos" → name="ovos"   |   "4 bananas maduras" → name="bananas maduras"
  return { quantity: formatQty(qty), unit: '', name: rest };
}

function mapImportToForm(data: RecipeImport) {
  return {
    title: data.title || '',
    description: '',
    // prepTime is NOT a form field — RecipeForm derives it from the sum of step timers
    servings: String(data.servings && data.servings > 0 ? data.servings : 4),
    category: '',
    photoUrl: '',
    ingredients:
      data.ingredients.length > 0
        ? data.ingredients.map(parseIngredient)
        : [{ quantity: '1', unit: '', name: '' }],
    steps:
      data.steps.length > 0
        ? data.steps.map(instruction => ({ instruction, timerMinutes: '5' }))
        : [{ instruction: '', timerMinutes: '5' }],
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function CreateRecipeScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const { colors } = useTheme();
  const styles = getStyles(colors);

  // Import modal state
  const [urlModalVisible, setUrlModalVisible] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [importing, setImporting] = useState(false);

  // Re-mounts RecipeForm on import so react-hook-form re-reads defaultValues
  const [importedData, setImportedData] = useState<any>(null);
  const [importKey, setImportKey] = useState(0);

  // Toast animation
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = () => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    Animated.sequence([
      Animated.timing(toastOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.delay(2800),
      Animated.timing(toastOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  };

  const handleImport = async () => {
    const url = urlInput.trim();
    if (!url) return;
    setImporting(true);
    try {
      const result = await api.post<RecipeImport>('/api/scrape', { url });
      setImportedData(mapImportToForm(result));
      setImportKey(k => k + 1);
      setUrlModalVisible(false);
      setUrlInput('');
      showToast();
    } catch (err: any) {
      Alert.alert(
        'Erro ao importar',
        err?.message ?? 'Não foi possível importar a receita. Verifique a URL e tente novamente.',
      );
    } finally {
      setImporting(false);
    }
  };

  const handleSubmit = async (data: any) => {
    if (!user) return;
    try {
      const input: CreateRecipeInput = {
        title: data.title,
        description: data.description || '',
        prepTime: data.prepTime,
        servings: parseInt(data.servings, 10),
        category: data.category,
        photoUrl: data.photoUrl,
        videoUrl: data.videoUrl || undefined,
        isPublic: false,
        ingredients: data.ingredients.map((i: any) => ({
          name: i.name,
          quantity: parseFloat(i.quantity.replace(',', '.')),
          unit: i.unit,
        })),
        steps: data.steps.map((s: any) => ({
          instruction: s.instruction,
          timerMinutes: parseInt(s.timerMinutes, 10),
        })),
      };
      await createRecipe(user.id, input);
      Alert.alert('Receita criada!', `"${input.title}" foi salva com sucesso.`);
      navigation.goBack();
    } catch {
      Alert.alert('Erro ao salvar', 'Não foi possível salvar a receita. Verifique sua conexão e tente novamente.');
    }
  };

  return (
    <>
      <RecipeForm
        key={importKey}
        titleHeader="Nova Receita"
        onSubmitData={handleSubmit}
        initialData={importedData}
        onImportPress={() => setUrlModalVisible(true)}
      />

      {/* ── Toast ──────────────────────────────────────────────────────────── */}
      <Animated.View style={[styles.toast, { opacity: toastOpacity }]} pointerEvents="none">
        <Feather name="check-circle" size={16} color="#fff" />
        <Text style={styles.toastText}>Receita importada! Revise os campos antes de salvar.</Text>
      </Animated.View>

      {/* ── Modal de URL ───────────────────────────────────────────────────── */}
      <Modal
        visible={urlModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => !importing && setUrlModalVisible(false)}
        statusBarTranslucent
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => !importing && setUrlModalVisible(false)}
        >
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <TouchableOpacity activeOpacity={1} style={styles.sheet} onPress={() => {}}>

              <View style={styles.handle} />

              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Importar de URL</Text>
                <TouchableOpacity
                  style={styles.closeBtn}
                  onPress={() => setUrlModalVisible(false)}
                  disabled={importing}
                >
                  <Feather name="x" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Aviso legal obrigatório */}
              <View style={styles.legalBanner}>
                <Feather name="alert-circle" size={14} color={colors.textSecondary} style={{ marginTop: 1 }} />
                <Text style={styles.legalText}>
                  Esta funcionalidade é para uso pessoal. Respeite os direitos autorais dos sites de origem.
                </Text>
              </View>

              <Text style={styles.supportedLabel}>Sites suportados</Text>
              <Text style={styles.supportedList}>
                tudogostoso.com.br · receitasnestle.com.br{'\n'}panelinha.com.br · guiadacozinha.com.br
              </Text>

              <TextInput
                style={styles.urlInput}
                placeholder="https://www.tudogostoso.com.br/receita/..."
                placeholderTextColor={colors.textSecondary}
                value={urlInput}
                onChangeText={setUrlInput}
                keyboardType="url"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleImport}
                editable={!importing}
              />

              <TouchableOpacity
                style={[
                  styles.importBtn,
                  (!urlInput.trim() || importing) && styles.importBtnDisabled,
                ]}
                onPress={handleImport}
                disabled={!urlInput.trim() || importing}
              >
                {importing ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Feather name="download" size={18} color="#fff" />
                    <Text style={styles.importBtnText}>Importar receita</Text>
                  </>
                )}
              </TouchableOpacity>

            </TouchableOpacity>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

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
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legalBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  legalText: {
    flex: 1,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  supportedLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: -theme.spacing.sm,
  },
  supportedList: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  urlInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  importBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    backgroundColor: colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.round,
    marginTop: theme.spacing.xs,
  },
  importBtnDisabled: {
    opacity: 0.45,
  },
  importBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  toast: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 16,
    left: theme.spacing.lg,
    right: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: '#1E1E1E',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 12,
    borderRadius: theme.borderRadius.round,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  toastText: {
    flex: 1,
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
});
