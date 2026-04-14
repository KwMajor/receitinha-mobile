import React, { useEffect } from 'react';
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { useAuthStore } from '../store/authStore';
import { onAuthStateChanged } from '../services/firebase/auth';
import { AuthStack } from './AuthStack';
import { MainTabs } from './MainTabs';
import { SplashScreen } from '../screens/auth/SplashScreen';
import { useTheme } from '../contexts/ThemeContext';

export const RootNavigator = () => {
  const { isAuthenticated, isLoading, setLoading, setUser } = useAuthStore();
  const { isDark, colors } = useTheme();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged((firebaseUser) => {
      if (firebaseUser) {
        setUser({
          id: firebaseUser.uid,
          name: firebaseUser.displayName || '',
          email: firebaseUser.email || '',
          createdAt: new Date(),
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [setUser, setLoading]);

  const navTheme = isDark
    ? { ...DarkTheme,    colors: { ...DarkTheme.colors,    primary: colors.primary, background: colors.background, card: colors.surface } }
    : { ...DefaultTheme, colors: { ...DefaultTheme.colors, primary: colors.primary, background: colors.background, card: colors.surface } };

  if (isLoading) return <SplashScreen />;

  return (
    <NavigationContainer theme={navTheme}>
      {isAuthenticated ? <MainTabs /> : <AuthStack />}
    </NavigationContainer>
  );
};
