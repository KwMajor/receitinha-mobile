import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useTimersStore, ActiveTimer } from '../../store/timersStore';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(s: number): string {
  const abs = Math.max(0, s);
  const m = Math.floor(abs / 60).toString().padStart(2, '0');
  const sec = (abs % 60).toString().padStart(2, '0');
  return `${m}:${sec}`;
}

function urgentTimer(timers: ActiveTimer[]): ActiveTimer {
  const running = timers.filter(t => t.isRunning);
  const paused = timers.filter(t => t.isPaused && !t.isDone);
  const pool = running.length > 0 ? running : paused.length > 0 ? paused : timers;
  return pool.reduce(
    (min, t) => t.remainingSeconds < min.remainingSeconds ? t : min,
    pool[0],
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export const FloatingTimerWidget: React.FC = () => {
  const { colors } = useTheme();
  const { timers, openDrawer } = useTimersStore();

  if (timers.length === 0) return null;

  const urgent = urgentTimer(timers);
  const isDone = urgent.isDone;

  return (
    <TouchableOpacity
      style={[
        styles.pill,
        { backgroundColor: isDone ? colors.error : colors.primary },
      ]}
      onPress={() => openDrawer()}
      activeOpacity={0.85}
      accessibilityLabel="Abrir gerenciador de timers"
      accessibilityRole="button"
    >
      <Feather name="clock" size={15} color="#fff" />
      <Text style={styles.time}>{fmt(urgent.remainingSeconds)}</Text>
      {timers.length > 1 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>×{timers.length}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  pill: {
    position: 'absolute',
    bottom: 80,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  time: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  badge: {
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
});
