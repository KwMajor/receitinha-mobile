import React, { useState, useRef, useEffect } from 'react';
import {
  Modal, View, Text, TouchableOpacity, ScrollView, TextInput,
  StyleSheet, Platform, KeyboardAvoidingView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { useTimersStore, ActiveTimer } from '../../store/timersStore';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(s: number): string {
  const abs = Math.max(0, s);
  const m = Math.floor(abs / 60).toString().padStart(2, '0');
  const sec = (abs % 60).toString().padStart(2, '0');
  return `${m}:${sec}`;
}

function timeColor(remaining: number): string {
  if (remaining <= 10) return '#EF5350';
  if (remaining <= 30) return '#FFA726';
  return '#66BB6A';
}

// ── Timer Row ─────────────────────────────────────────────────────────────────

interface TimerRowProps {
  timer: ActiveTimer;
}

const TimerRow: React.FC<TimerRowProps> = ({ timer }) => {
  const { colors } = useTheme();
  const { pauseTimer, resumeTimer, removeTimer } = useTimersStore();
  const rowStyles = getRowStyles(colors);

  const color = timer.isDone ? colors.error : timeColor(timer.remainingSeconds);
  const progress = timer.durationSeconds > 0
    ? Math.max(0, timer.remainingSeconds / timer.durationSeconds)
    : 0;

  return (
    <View style={rowStyles.card}>
      {/* Label + controls */}
      <View style={rowStyles.top}>
        <Text style={rowStyles.label} numberOfLines={1}>{timer.label}</Text>
        <View style={rowStyles.controls}>
          {!timer.isDone && (
            <TouchableOpacity
              style={rowStyles.controlBtn}
              onPress={() => timer.isRunning ? pauseTimer(timer.id) : resumeTimer(timer.id)}
              accessibilityRole="button"
              accessibilityLabel={timer.isRunning ? 'Pausar timer' : 'Retomar timer'}
            >
              <Feather
                name={timer.isRunning ? 'pause' : 'play'}
                size={16}
                color={colors.primary}
              />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={rowStyles.controlBtn}
            onPress={() => removeTimer(timer.id)}
            accessibilityRole="button"
            accessibilityLabel="Remover timer"
          >
            <Feather name="x" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* MM:SS */}
      <Text style={[rowStyles.time, { color }]}>
        {timer.isDone ? 'Concluído!' : fmt(timer.remainingSeconds)}
      </Text>

      {/* Progress bar */}
      <View style={rowStyles.progressBg}>
        <View
          style={[
            rowStyles.progressFill,
            {
              width: `${(progress * 100).toFixed(1)}%`,
              backgroundColor: color,
            },
          ]}
        />
      </View>
    </View>
  );
};

const getRowStyles = (colors: any) => StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  label: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  controls: {
    flexDirection: 'row',
    gap: 4,
  },
  controlBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  time: {
    fontSize: 32,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    letterSpacing: 1,
  },
  progressBg: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
});

// ── Drawer ────────────────────────────────────────────────────────────────────

export const TimerDrawer: React.FC = () => {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const { timers, drawerOpen, drawerAddMode, closeDrawer, addTimer, startTimer, clearDone } = useTimersStore();

  const [newLabel, setNewLabel] = useState('');
  const [newMinutes, setNewMinutes] = useState('');
  const labelRef = useRef<TextInput>(null);
  const scrollRef = useRef<ScrollView>(null);

  const hasDone = timers.some(t => t.isDone);

  // Auto-focus label when opened in add mode
  useEffect(() => {
    if (drawerOpen && drawerAddMode) {
      const id = setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
        labelRef.current?.focus();
      }, 350);
      return () => clearTimeout(id);
    }
  }, [drawerOpen, drawerAddMode]);

  const handleAdd = () => {
    const label = newLabel.trim();
    const mins = parseFloat(newMinutes.replace(',', '.'));
    if (!label || isNaN(mins) || mins <= 0) return;

    const secs = Math.round(mins * 60);
    const id = addTimer(label, secs);
    startTimer(id);
    setNewLabel('');
    setNewMinutes('');
  };

  return (
    <Modal
      visible={drawerOpen}
      transparent
      animationType="slide"
      onRequestClose={closeDrawer}
      statusBarTranslucent
    >
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={closeDrawer}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.kav}
        >
          {/* Prevent taps inside the sheet from closing */}
          <TouchableOpacity activeOpacity={1} style={styles.sheet} onPress={() => {}}>
            {/* Handle */}
            <View style={styles.handle} />

            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Timers</Text>
              {hasDone && (
                <TouchableOpacity style={styles.clearBtn} onPress={clearDone}>
                  <Text style={styles.clearBtnText}>Limpar concluídos</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.closeBtn} onPress={closeDrawer}>
                <Feather name="x" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              ref={scrollRef}
              style={styles.list}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Timer list */}
              {timers.length === 0 && (
                <View style={styles.empty}>
                  <Feather name="clock" size={36} color={colors.border} />
                  <Text style={styles.emptyText}>Nenhum timer ativo</Text>
                </View>
              )}
              {timers.map(t => <TimerRow key={t.id} timer={t} />)}

              {/* Divider */}
              <View style={styles.divider} />

              {/* Add manual timer */}
              <Text style={styles.addTitle}>Adicionar timer manual</Text>

              <TextInput
                ref={labelRef}
                style={styles.input}
                placeholder="Nome do timer (ex: Macarrão)"
                placeholderTextColor={colors.textSecondary}
                value={newLabel}
                onChangeText={setNewLabel}
                returnKeyType="next"
              />
              <TextInput
                style={styles.input}
                placeholder="Duração em minutos (ex: 8)"
                placeholderTextColor={colors.textSecondary}
                value={newMinutes}
                onChangeText={setNewMinutes}
                keyboardType="decimal-pad"
                returnKeyType="done"
                onSubmitEditing={handleAdd}
              />
              <TouchableOpacity
                style={[styles.addBtn, (!newLabel.trim() || !newMinutes.trim()) && styles.addBtnDisabled]}
                onPress={handleAdd}
                disabled={!newLabel.trim() || !newMinutes.trim()}
              >
                <Feather name="play" size={16} color="#fff" />
                <Text style={styles.addBtnText}>Iniciar</Text>
              </TouchableOpacity>
            </ScrollView>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </TouchableOpacity>
    </Modal>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────

const getStyles = (colors: any) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  kav: {
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: theme.spacing.sm,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '85%',
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
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  clearBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.round,
    backgroundColor: colors.error + '18',
  },
  clearBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.error,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  listContent: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
    gap: theme.spacing.sm,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: theme.spacing.md,
  },
  addTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: theme.spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.surface,
    marginBottom: theme.spacing.sm,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    backgroundColor: colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.round,
    marginTop: theme.spacing.xs,
  },
  addBtnDisabled: {
    opacity: 0.45,
  },
  addBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
