import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import {
  fullBackup,
  restoreAll,
  deleteBackup,
  getLastBackupTimestamp,
} from '../../services/firebase/backupService';
import { theme } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';

// ── Helpers ────────────────────────────────────────────────────────────────────

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function formatBackupTime(ts: number | null): string {
  if (!ts) return 'Nunca';

  const now = Date.now();
  const diff = now - ts;
  const date = new Date(ts);

  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');

  if (diff < ONE_DAY_MS) return `hoje às ${hh}:${mm}`;
  if (diff < 2 * ONE_DAY_MS) return `ontem às ${hh}:${mm}`;

  const MONTHS = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
  return `${date.getDate()} ${MONTHS[date.getMonth()]} às ${hh}:${mm}`;
}

function friendlyError(code?: string): string {
  if (!code) return 'Falha no backup. Tente novamente.';
  if (code.includes('permission-denied') || code.includes('PERMISSION_DENIED'))
    return 'Sem permissão no Firestore. Verifique as regras de segurança do projeto Firebase.';
  if (code.includes('unavailable') || code.includes('network'))
    return 'Sem conexão com a internet. Verifique sua rede e tente novamente.';
  if (code.includes('not-found') || code.includes('NOT_FOUND'))
    return 'Firestore não encontrado. Verifique se o banco de dados está ativado no console do Firebase.';
  if (code.includes('unauthenticated') || code.includes('UNAUTHENTICATED'))
    return 'Sessão expirada. Saia e entre novamente na conta.';
  return `Falha no backup (${code}). Verifique o console para detalhes.`;
}

function statusColor(ts: number | null, colors: any): string {
  if (!ts) return colors.error;
  const diff = Date.now() - ts;
  if (diff < ONE_DAY_MS) return colors.success;
  if (diff < SEVEN_DAYS_MS) return '#F5A623';
  return colors.error;
}

function statusLabel(ts: number | null): string {
  if (!ts) return 'Sem backup';
  const diff = Date.now() - ts;
  if (diff < ONE_DAY_MS) return 'Em dia';
  if (diff < SEVEN_DAYS_MS) return 'Há mais de um dia';
  return 'Desatualizado';
}

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
  card: {
    backgroundColor: colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: theme.spacing.md,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: theme.spacing.sm,
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  infoText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  infoValue: {
    fontWeight: '500',
    color: colors.text,
  },
  feedbackBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  feedbackText: {
    fontSize: 14,
    flex: 1,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.primary,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  secondaryBtnText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  btnDisabled: {
    opacity: 0.5,
  },
  syncItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  syncLabel: {
    fontSize: 15,
    color: colors.text,
  },
  note: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: theme.spacing.xs,
    fontStyle: 'italic',
  },
  privacyText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: theme.spacing.md,
  },
  privacyLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  privacyLinkText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.error,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.sm,
  },
  deleteBtnText: {
    color: colors.error,
    fontSize: 16,
    fontWeight: '600',
  },
});

// ── Componente ─────────────────────────────────────────────────────────────────

export const BackupScreen = () => {
  const { user } = useAuthStore();
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const [lastBackup, setLastBackup] = useState<number | null>(null);
  const [loadingTimestamp, setLoadingTimestamp] = useState(true);
  const [backingUp, setBackingUp] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; ok: boolean } | null>(null);

  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showFeedback = useCallback((message: string, ok: boolean) => {
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    setFeedback({ message, ok });
    feedbackTimer.current = setTimeout(() => setFeedback(null), 4000);
  }, []);

  useEffect(() => {
    return () => {
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    };
  }, []);

  const loadTimestamp = useCallback(async () => {
    if (!user?.id) return;
    setLoadingTimestamp(true);
    try {
      const ts = await getLastBackupTimestamp(user.id);
      setLastBackup(ts);
    } finally {
      setLoadingTimestamp(false);
    }
  }, [user?.id]);

  useEffect(() => { loadTimestamp(); }, [loadTimestamp]);

  const handleBackup = async () => {
    if (!user?.id) return;
    setBackingUp(true);
    try {
      const result = await fullBackup(user.id);
      if (result.success) {
        setLastBackup(result.timestamp);
        showFeedback(
          `${result.recipesCount} receita${result.recipesCount !== 1 ? 's' : ''} sincronizada${result.recipesCount !== 1 ? 's' : ''} com sucesso.`,
          true
        );
      } else {
        showFeedback(friendlyError(result.error), false);
      }
    } catch (e: any) {
      showFeedback(friendlyError(e?.code ?? e?.message), false);
    } finally {
      setBackingUp(false);
    }
  };

  const handleRestore = () => {
    Alert.alert(
      'Restaurar dados da nuvem',
      'Esta ação importa os dados do backup para sua conta atual. Dados que já existem não serão duplicados. Continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Restaurar',
          onPress: async () => {
            if (!user?.id) return;
            setRestoring(true);
            try {
              const result = await restoreAll(user.id);
              const parts: string[] = [];
              if (result.restored > 0)
                parts.push(`${result.restored} item${result.restored !== 1 ? 'ns' : ''} restaurado${result.restored !== 1 ? 's' : ''}`);
              if (result.skipped > 0)
                parts.push(`${result.skipped} já existia${result.skipped !== 1 ? 'm' : ''}`);
              if (result.errors > 0)
                parts.push(`${result.errors} com erro`);
              showFeedback(
                parts.length ? parts.join(', ') + '.' : 'Nenhum dado novo encontrado no backup.',
                result.errors === 0
              );
            } catch {
              showFeedback('Falha ao restaurar. Verifique sua conexão e tente novamente.', false);
            } finally {
              setRestoring(false);
            }
          },
        },
      ]
    );
  };

  const handleDelete = () => {
    if (!lastBackup) {
      showFeedback('Nenhum backup encontrado na nuvem.', false);
      return;
    }
    Alert.alert(
      'Apagar backup da nuvem',
      'Todos os dados do backup (receitas, favoritos, coleções e planos) serão removidos permanentemente do Firestore. Esta ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Apagar',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Confirmar exclusão',
              'Tem certeza? O backup será apagado permanentemente.',
              [
                { text: 'Cancelar', style: 'cancel' },
                {
                  text: 'Apagar definitivamente',
                  style: 'destructive',
                  onPress: async () => {
                    if (!user?.id) return;
                    setDeleting(true);
                    try {
                      await deleteBackup(user.id);
                      setLastBackup(null);
                      showFeedback('Backup apagado da nuvem com sucesso.', true);
                    } catch (e: any) {
                      showFeedback(friendlyError(e?.code ?? e?.message), false);
                    } finally {
                      setDeleting(false);
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const color = statusColor(lastBackup, colors);
  const isWorking = backingUp || restoring || deleting;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Status do backup</Text>

        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: color }]} />
          <Text style={[styles.statusLabel, { color }]}>{statusLabel(lastBackup)}</Text>
        </View>

        <View style={styles.infoRow}>
          <Feather name="clock" size={16} color={colors.textSecondary} />
          <Text style={styles.infoText}>
            Último backup:{' '}
            {loadingTimestamp ? (
              <Text style={styles.infoValue}>carregando…</Text>
            ) : (
              <Text style={styles.infoValue}>{formatBackupTime(lastBackup)}</Text>
            )}
          </Text>
        </View>
      </View>

      {feedback && (
        <View style={[styles.feedbackBar, { backgroundColor: feedback.ok ? '#E8F5E9' : '#FFEBEE' }]}>
          <Feather
            name={feedback.ok ? 'check-circle' : 'alert-circle'}
            size={16}
            color={feedback.ok ? colors.success : colors.error}
          />
          <Text style={[styles.feedbackText, { color: feedback.ok ? colors.success : colors.error }]}>
            {feedback.message}
          </Text>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Ações</Text>

        <TouchableOpacity
          style={[styles.primaryBtn, isWorking && styles.btnDisabled]}
          onPress={handleBackup}
          disabled={isWorking}
        >
          {backingUp ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Feather name="upload-cloud" size={18} color="#fff" />
              <Text style={styles.primaryBtnText}>Fazer backup agora</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryBtn, isWorking && styles.btnDisabled]}
          onPress={handleRestore}
          disabled={isWorking}
        >
          {restoring ? (
            <ActivityIndicator color={colors.primary} size="small" />
          ) : (
            <>
              <Feather name="download-cloud" size={18} color={colors.primary} />
              <Text style={styles.secondaryBtnText}>Restaurar dados da nuvem</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.deleteBtn, isWorking && styles.btnDisabled]}
          onPress={handleDelete}
          disabled={isWorking}
        >
          {deleting ? (
            <ActivityIndicator color={colors.error} size="small" />
          ) : (
            <>
              <Feather name="trash-2" size={18} color={colors.error} />
              <Text style={styles.deleteBtnText}>Apagar backup da nuvem</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>O que é sincronizado</Text>

        {[
          { icon: 'book' as const,          label: 'Receitas criadas' },
          { icon: 'heart' as const,         label: 'Receitas favoritas' },
          { icon: 'folder' as const,        label: 'Coleções' },
          { icon: 'calendar' as const,      label: 'Planos semanais (últimas 4 semanas)' },
        ].map(({ icon, label }) => (
          <View key={label} style={styles.syncItem}>
            <Feather name={icon} size={16} color={colors.primary} />
            <Text style={styles.syncLabel}>{label}</Text>
          </View>
        ))}

        <Text style={styles.note}>
          Fotos de receitas não são incluídas no backup — apenas os dados e as URLs das imagens.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Privacidade</Text>
        <Text style={styles.privacyText}>
          Seus dados são armazenados com segurança no Firebase Firestore, vinculados exclusivamente à sua conta. Apenas você tem acesso.
        </Text>
        <TouchableOpacity style={styles.privacyLink} disabled>
          <Feather name="external-link" size={14} color={colors.primary} />
          <Text style={styles.privacyLinkText}>Política de Privacidade</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};
