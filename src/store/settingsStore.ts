import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeOption    = 'light' | 'dark' | 'system';
export type FontSizeOption = 'small' | 'medium' | 'large';
export type VoiceRateOption = 'slow' | 'normal' | 'fast';

export const VOICE_RATE_VALUES: Record<VoiceRateOption, number> = {
  slow:   0.5,
  normal: 1.0,
  fast:   1.5,
};

interface SettingsState {
  theme:            ThemeOption;
  fontSize:         FontSizeOption;
  voiceAutoRead:    boolean;
  voiceRate:        VoiceRateOption;
  setTheme:         (t: ThemeOption) => void;
  setFontSize:      (f: FontSizeOption) => void;
  setVoiceAutoRead: (v: boolean) => void;
  setVoiceRate:     (r: VoiceRateOption) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist<SettingsState>(
    (set) => ({
      theme:            'system',
      fontSize:         'medium',
      voiceAutoRead:    false,
      voiceRate:        'normal',
      setTheme:         (theme)         => set({ theme }),
      setFontSize:      (fontSize)      => set({ fontSize }),
      setVoiceAutoRead: (voiceAutoRead) => set({ voiceAutoRead }),
      setVoiceRate:     (voiceRate)     => set({ voiceRate }),
    }),
    {
      name:    '@receitinha:settings',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        theme:         state.theme,
        fontSize:      state.fontSize,
        voiceAutoRead: state.voiceAutoRead,
        voiceRate:     state.voiceRate,
      } as SettingsState),
    }
  )
);
