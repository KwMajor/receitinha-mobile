import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeOption    = 'light' | 'dark' | 'system';
export type FontSizeOption = 'small' | 'medium' | 'large';

interface SettingsState {
  theme:       ThemeOption;
  fontSize:    FontSizeOption;
  setTheme:    (t: ThemeOption) => void;
  setFontSize: (f: FontSizeOption) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist<SettingsState>(
    (set) => ({
      theme:       'system',
      fontSize:    'medium',
      setTheme:    (theme)    => set({ theme }),
      setFontSize: (fontSize) => set({ fontSize }),
    }),
    {
      name:    '@receitinha:settings',
      storage: createJSONStorage(() => AsyncStorage),
      // Persiste apenas as preferências, não as actions
      partialize: (state) => ({ theme: state.theme, fontSize: state.fontSize } as SettingsState),
    }
  )
);
