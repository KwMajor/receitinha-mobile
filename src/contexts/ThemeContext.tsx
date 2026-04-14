import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme, StatusBar } from 'react-native';
import { useSettingsStore } from '../store/settingsStore';
import { lightTheme, darkTheme, fontSizes, lightColors } from '../constants/theme';

// ── Tipos ──────────────────────────────────────────────────────────────────────

type Colors    = typeof lightColors;
type FontSizes = typeof fontSizes.medium;

interface ThemeContextValue {
  colors:    Colors;
  fontSizes: FontSizes;
  isDark:    boolean;
  spacing:   typeof lightTheme.spacing;
  borderRadius: typeof lightTheme.borderRadius;
}

// ── Contexto ───────────────────────────────────────────────────────────────────

const ThemeContext = createContext<ThemeContextValue>({
  colors:       lightTheme.colors,
  fontSizes:    fontSizes.medium,
  isDark:       false,
  spacing:      lightTheme.spacing,
  borderRadius: lightTheme.borderRadius,
});

// ── Provider ───────────────────────────────────────────────────────────────────

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { theme, fontSize } = useSettingsStore();
  const systemScheme = useColorScheme();

  const isDark = useMemo(() => {
    if (theme === 'dark')   return true;
    if (theme === 'light')  return false;
    return systemScheme === 'dark';
  }, [theme, systemScheme]);

  const activeTheme = isDark ? darkTheme : lightTheme;
  const activeFontSizes = fontSizes[fontSize] ?? fontSizes.medium;

  const value = useMemo<ThemeContextValue>(() => ({
    colors:       activeTheme.colors,
    fontSizes:    activeFontSizes,
    isDark,
    spacing:      activeTheme.spacing,
    borderRadius: activeTheme.borderRadius,
  }), [activeTheme, activeFontSizes, isDark]);

  return (
    <ThemeContext.Provider value={value}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={activeTheme.colors.background}
        translucent={false}
      />
      {children}
    </ThemeContext.Provider>
  );
};

// ── Hook ───────────────────────────────────────────────────────────────────────

export const useTheme = (): ThemeContextValue => useContext(ThemeContext);
