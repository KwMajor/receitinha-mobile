import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, SectionList, TouchableOpacity, StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { SpendingMonth, SpendingRecord } from '../../types';
import { getSpendingHistory } from '../../services/sqlite/shoppingService';

const MONTHS_PT = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

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

function fmtMonthLabel(ym: string): string {
  const [y, m] = ym.split('-');
  return `${MONTHS_PT[parseInt(m, 10) - 1]} ${y}`;
}

function fmtCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

export const SpendingHistoryScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const [data, setData] = useState<SpendingMonth[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getSpendingHistory(6);
      setData(result);
    } catch {
      setError('Não foi possível carregar o histórico.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const grandTotal = data.reduce((s, m) => s + m.total, 0);

  const sections = data.map(m => ({
    month: m.month,
    total: m.total,
    data: m.records,
  }));

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Histórico de Gastos</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ flex: 1 }} color={colors.primary} size="large" />
      ) : error ? (
        <View style={styles.centerState}>
          <Feather name="alert-circle" size={40} color={colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={load}>
            <Text style={styles.retryText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      ) : data.length === 0 ? (
        <View style={styles.centerState}>
          <Feather name="shopping-bag" size={48} color={colors.border} />
          <Text style={styles.emptyTitle}>Nenhum gasto registrado</Text>
          <Text style={styles.emptySubtitle}>
            Toque no ícone de etiqueta em um item da lista de compras e informe o preço pago. Os dados são salvos aqui automaticamente.
          </Text>
        </View>
      ) : (
        <>
          {/* Total banner */}
          <View style={styles.totalBanner}>
            <Text style={styles.totalLabel}>Total registrado (6 meses)</Text>
            <Text style={styles.totalValue}>R$ {fmtCurrency(grandTotal)}</Text>
          </View>

          <SectionList
            sections={sections}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
            stickySectionHeadersEnabled
            renderSectionHeader={({ section }) => (
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionMonth}>{fmtMonthLabel(section.month)}</Text>
                <Text style={styles.sectionTotal}>R$ {fmtCurrency(section.total)}</Text>
              </View>
            )}
            renderItem={({ item }: { item: SpendingRecord }) => {
              const meta = CATEGORY_META[item.category] ?? CATEGORY_META['Outros'];
              return (
                <View style={styles.row}>
                  <View style={[styles.rowIcon, { backgroundColor: meta.color + '20' }]}>
                    <Feather name={meta.icon as any} size={15} color={meta.color} />
                  </View>
                  <View style={styles.rowInfo}>
                    <Text style={styles.rowName} numberOfLines={1}>{item.itemName}</Text>
                    <Text style={styles.rowMeta} numberOfLines={1}>
                      {item.category}
                      {item.listName ? ` · ${item.listName}` : ''}
                    </Text>
                  </View>
                  <View style={styles.rowRight}>
                    <Text style={styles.rowPrice}>R$ {fmtCurrency(item.price)}</Text>
                    <Text style={styles.rowDate}>{fmtDate(item.recordedAt)}</Text>
                  </View>
                </View>
              );
            }}
            renderSectionFooter={({ section }) => (
              <View style={styles.sectionFooter}>
                <Text style={styles.sectionFooterText}>
                  {section.data.length} {section.data.length === 1 ? 'item' : 'itens'} registrados
                </Text>
              </View>
            )}
          />
        </>
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
  totalBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
    backgroundColor: colors.primary + '12',
    borderBottomWidth: 1,
    borderBottomColor: colors.primary + '30',
  },
  totalLabel: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
    marginBottom: 2,
  },
  totalValue: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.primary,
  },
  totalMonthCount: { alignItems: 'center' },
  totalMonthCountText: { fontSize: 22, fontWeight: '800', color: colors.primary },
  totalMonthCountLabel: { fontSize: 11, color: colors.primary, fontWeight: '600' },
  listContent: { paddingBottom: 40 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  sectionMonth: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionTotal: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
    gap: theme.spacing.md,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 14, fontWeight: '600', color: colors.text },
  rowMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  rowRight: { alignItems: 'flex-end', gap: 2 },
  rowPrice: { fontSize: 14, fontWeight: '700', color: '#43A047' },
  rowDate: { fontSize: 11, color: colors.textSecondary },
  sectionFooter: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
    backgroundColor: colors.surface,
  },
  sectionFooterText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  centerState: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: theme.spacing.xl, gap: theme.spacing.md,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  emptySubtitle: {
    fontSize: 14, color: colors.textSecondary,
    textAlign: 'center', lineHeight: 20,
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
