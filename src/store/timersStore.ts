import { create } from 'zustand';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface ActiveTimer {
  id: string;
  label: string;
  durationSeconds: number;
  remainingSeconds: number;
  isRunning: boolean;
  isPaused: boolean;
  isDone: boolean;
  startedAt: number | null;
}

interface TimersState {
  timers: ActiveTimer[];
  drawerOpen: boolean;
  drawerAddMode: boolean;

  // Timer actions
  addTimer: (label: string, durationSeconds: number) => string;
  removeTimer: (id: string) => void;
  startTimer: (id: string) => void;
  pauseTimer: (id: string) => void;
  resumeTimer: (id: string) => void;
  resetTimer: (id: string) => void;
  clearDone: () => void;

  /**
   * Decrements all running timers by 1 second.
   * Returns the labels of timers that just reached 0 (for notification dispatch).
   */
  tickAll: () => string[];

  // Drawer actions
  openDrawer: (addMode?: boolean) => void;
  closeDrawer: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function genId(): string {
  return `tmr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useTimersStore = create<TimersState>((set, get) => ({
  timers: [],
  drawerOpen: false,
  drawerAddMode: false,

  // ── Timer actions ──────────────────────────────────────────────────────────

  addTimer: (label, durationSeconds) => {
    const id = genId();
    set(s => ({
      timers: [
        ...s.timers,
        {
          id,
          label,
          durationSeconds,
          remainingSeconds: durationSeconds,
          isRunning: false,
          isPaused: false,
          isDone: false,
          startedAt: null,
        },
      ],
    }));
    return id;
  },

  removeTimer: (id) =>
    set(s => ({ timers: s.timers.filter(t => t.id !== id) })),

  startTimer: (id) =>
    set(s => ({
      timers: s.timers.map(t =>
        t.id === id
          ? { ...t, isRunning: true, isPaused: false, isDone: false, startedAt: Date.now() }
          : t,
      ),
    })),

  pauseTimer: (id) =>
    set(s => ({
      timers: s.timers.map(t =>
        t.id === id ? { ...t, isRunning: false, isPaused: true } : t,
      ),
    })),

  resumeTimer: (id) =>
    set(s => ({
      timers: s.timers.map(t =>
        t.id === id ? { ...t, isRunning: true, isPaused: false } : t,
      ),
    })),

  resetTimer: (id) =>
    set(s => ({
      timers: s.timers.map(t =>
        t.id === id
          ? { ...t, isRunning: false, isPaused: false, isDone: false, remainingSeconds: t.durationSeconds, startedAt: null }
          : t,
      ),
    })),

  clearDone: () =>
    set(s => ({ timers: s.timers.filter(t => !t.isDone) })),

  tickAll: () => {
    const justDoneLabels: string[] = [];
    const updated = get().timers.map(t => {
      if (!t.isRunning || t.remainingSeconds <= 0) return t;
      const next = t.remainingSeconds - 1;
      if (next <= 0) {
        justDoneLabels.push(t.label);
        return { ...t, remainingSeconds: 0, isRunning: false, isDone: true };
      }
      return { ...t, remainingSeconds: next };
    });
    set({ timers: updated });
    return justDoneLabels;
  },

  // ── Drawer actions ─────────────────────────────────────────────────────────

  openDrawer: (addMode = false) => set({ drawerOpen: true, drawerAddMode: addMode }),
  closeDrawer: () => set({ drawerOpen: false, drawerAddMode: false }),
}));
