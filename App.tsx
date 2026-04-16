import { StyleSheet, Text, View, ActivityIndicator, AppState, AppStateStatus } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { initDatabase } from './src/services/sqlite/database';
import { RootNavigator } from './src/navigation/RootNavigator';
import { ErrorBoundary } from './src/components/common/ErrorBoundary';
import { ThemeProvider } from './src/contexts/ThemeContext';
import { useSettingsStore } from './src/store/settingsStore';
import { useTimersStore } from './src/store/timersStore';
import { notifyTimerComplete } from './src/services/notifications';

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Motor global de ticks ────────────────────────────────────────────────────
  useEffect(() => {
    const startTick = () => {
      if (intervalRef.current) return;
      intervalRef.current = setInterval(() => {
        const justDone = useTimersStore.getState().tickAll();
        for (const label of justDone) {
          notifyTimerComplete(label).catch(() => {});
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
        }
      }, 1000);
    };

    const stopTick = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    startTick();

    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') startTick();
      else stopTick();
    });

    return () => {
      stopTick();
      sub.remove();
    };
  }, []);

  useEffect(() => {
    async function setupApp() {
      try {
        // Hidrata as preferências do usuário e o banco antes do primeiro render
        await Promise.all([
          initDatabase(),
          useSettingsStore.persist.rehydrate(),
        ]);
      } catch (e) {
        console.warn('Erro ao inicializar o app:', e);
      } finally {
        setIsReady(true);
      }
    }
    setupApp();
  }, []);

  if (!isReady) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#FF6C37" />
        <Text style={{ marginTop: 10 }}>Iniciando Receitinha...</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <ThemeProvider>
          <RootNavigator />
        </ThemeProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    backgroundColor: '#F5F5F5',
  }
});
