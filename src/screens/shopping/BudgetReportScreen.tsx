import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { BudgetReport } from '../../types';
import { getBudgetReport } from '../../services/sqlite/shoppingService';

const MONTHS_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const CATEGORY_META: Record<string, { icon: string; color: string }> = {
  'Hortifruti':      { icon: 'sun',         color: '#4CAF50' },
  'Carnes e Peixes': { icon: 'scissors',    color: '#EF5350' },
  'Laticínios':      { icon: 'droplet',     color: '#42A5F5' },
  'Padaria':         { icon: 'coffee',      color: '#FFA726' },
  'Mercearia':       { icon: 'package',     color: '#AB47BC' },
  'Bebidas':         { icon: 'thermometer', color: '#26C6DA' },
  'Temperos':        { icon: 'wind',        color: '#FF7043' },
  'Outros':          { icon: 'grid',        color: '#78909C' },
};

function fmtMonth(ym: string): string {
  const [, m] = ym.split('-');
  return MONTHS_PT[parseInt(m, 10) - 1] ?? ym;
}

function fmtCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export const BudgetReportScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const [report, setReport] = useState<BudgetReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getBudgetReport(4);
      setReport(data);
    } catch {
      setError('Não foi possível carregar o relatório.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Derived values ──────────────────────────────────────────────────────────

  const months = report?.months ?? [];
  const categories = report?.categories ?? [];

  const currentMonthKey = (() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  })();

  const currentTotal = months.find(m => m.month === currentMonthKey)?.total ?? 0;
  const avgTotal = months.length > 0
    ? months.reduce((s, m) => s + m.total, 0) / months.length
    : 0;
  const maxMonth = months.reduce<{ month: string; total: number } | null>(
    (best, m) => (!best || m.total > best.total ? m : best), null
  );
  const chartMax = Math.max(...months.map(m => m.total), 1);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Relatório de Gastos</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ flex: 1 }} color={colors.primary} size="large" />
      ) : error ? (
        <View style={styles.errorState}>
          <Feather name="alert-circle" size={40} color={colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={load}>
            <Text style={styles.retryText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

          {/* Summary cards */}
          <View style={styles.cardsRow}>
            <View style={[styles.card, styles.cardPrimary]}>
              <Text style={styles.cardLabel}>Mês atual</Text>
              <Text style={styles.cardValue}>R$ {fmtCurrency(currentTotal)}</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Média mensal</Text>
              <Text style={styles.cardValue}>R$ {fmtCurrency(avgTotal)}</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Maior gasto</Text>
              <Text style={styles.cardValue}>
                {maxMonth ? fmtMonth(maxMonth.month) : '—'}
              </Text>
              {maxMonth && (
                <Text style={styles.cardSub}>R$ {fmtCurrency(maxMonth.total)}</Text>
              )}
            </View>
          </View>

          {/* Bar chart */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Últimos meses</Text>
            {months.length === 0 ? (
              <View style={styles.emptyChart}>
                <Feather name="bar-chart-2" size={32} color={colors.border} />
                <Text style={styles.emptyText}>Nenhum gasto registrado ainda.</Text>
                <Text style={styles.emptyHint}>
                  Toque no ícone de etiqueta em um item e informe o preço pago.
                </Text>
              </View>
            ) : (
              <View style={styles.chart}>
                {months.map((m) => {
                  const heightPct = m.total / chartMax;
                  const isCurrentMonth = m.month === currentMonthKey;
                  return (
                    <View key={m.month} style={styles.barWrapper}>
                      <Text style={styles.barAmount}>
                        {m.total >= 1000
                          ? `${(m.total / 1000).toFixed(1)}k`
                          : fmtCurrency(m.total)}
                      </Text>
                      <View style={styles.barTrack}>
                        <View
                          style={[
                            styles.barFill,
                            {
                              height: `${Math.max(heightPct * 100, 4)}%` as any,
                              backgroundColor: isCurrentMonth ? colors.primary : colors.primary + '60',
                            },
                          ]}
                        />
                      </View>
                      <Text style={[styles.barLabel, isCurrentMonth && styles.barLabelActive]}>
                        {fmtMonth(m.month)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {/* Category breakdown */}
          {categories.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Por categoria</Text>
              <View style={styles.categoryList}>
                {categories.map((cat) => {
                  const meta = CATEGORY_META[cat.category] ?? CATEGORY_META['Outros'];
                  return (
                    <View key={cat.category} style={styles.categoryRow}>
                      <View style={[styles.categoryIcon, { backgroundColor: meta.color + '20' }]}>
                        <Feather name={meta.icon as any} size={16} color={meta.color} />
                      </View>
                      <View style={styles.categoryInfo}>
                        <Text style={styles.categoryName}>{cat.category}</Text>
                        <View style={styles.categoryBarTrack}>
                          <View
                            style={[
                              styles.categoryBarFill,
                              { width: `${cat.percentage}%` as any, backgroundColor: meta.color },
                            ]}
                          />
                        </View>
                      </View>
                      <View style={styles.categoryValues}>
                        <Text style={styles.categoryAmount}>R$ {fmtCurrency(cat.total)}</Text>
                        <Text style={styles.categoryPct}>{cat.percentage}%</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const getStyles = (colors: any) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 4,
  },
  backBtn: { padding: theme.spacing.sm },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginLeft: theme.spacing.xs,
  },
  content: {
    padding: theme.spacing.md,
    gap: theme.spacing.lg,
    paddingBottom: 40,
  },
  // Summary cards
  cardsRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardPrimary: {
    backgroundColor: colors.primary + '12',
    borderColor: colors.primary + '40',
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  cardValue: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  cardSub: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  // Section
  section: {
    gap: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Bar chart
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 160,
    gap: theme.spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  barWrapper: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    gap: 4,
  },
  barAmount: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  barTrack: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
  },
  barFill: {
    width: '100%',
    borderRadius: 4,
    minHeight: 4,
  },
  barLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  barLabelActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  emptyChart: {
    backgroundColor: colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: theme.spacing.xl,
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  emptyHint: {
    fontSize: 12,
    color: colors.textTertiary,
    textAlign: 'center',
  },
  // Category list
  categoryList: {
    backgroundColor: colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    gap: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  categoryIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryInfo: {
    flex: 1,
    gap: 6,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  categoryBarTrack: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  categoryBarFill: {
    height: 4,
    borderRadius: 2,
  },
  categoryValues: {
    alignItems: 'flex-end',
    gap: 2,
  },
  categoryAmount: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  categoryPct: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  // Error / loading states
  errorState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  errorText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
  retryBtn: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: theme.borderRadius.md,
  },
  retryText: { fontSize: 14, fontWeight: '600', color: '#fff' },
});
