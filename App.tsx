import { StyleSheet, Text, View, ActivityIndicator, StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { initDatabase } from './src/services/sqlite/database';
import { RootNavigator } from './src/navigation/RootNavigator';
import { ErrorBoundary } from './src/components/common/ErrorBoundary';

export default function App() {
  const [isDbReady, setIsDbReady] = useState(false);

  useEffect(() => {
    async function setupApp() {
      try {
        await initDatabase();
      } catch (e) {
        console.warn('Erro ao inicializar o app:', e);
      } finally {
        setIsDbReady(true);
      }
    }
    
    setupApp();
  }, []);

  if (!isDbReady) {
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
        <StatusBar barStyle="dark-content" translucent={false} backgroundColor="#ffffff" />
        <RootNavigator />
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
