import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { initDatabase } from './src/services/sqlite/database';
import { RootNavigator } from './src/navigation/RootNavigator';
import { ErrorBoundary } from './src/components/common/ErrorBoundary';
import { ThemeProvider } from './src/contexts/ThemeContext';
import { useSettingsStore } from './src/store/settingsStore';

export default function App() {
  const [isReady, setIsReady] = useState(false);

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
