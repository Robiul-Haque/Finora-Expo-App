import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';
import { ThemeColors, lightTheme, darkTheme } from '../constants/theme';

// Detect initial system theme on device
const getSystemIsDark = (): boolean => {
  const scheme = Appearance.getColorScheme();
  return scheme === 'dark';
};

interface ThemeState {
  isDarkMode: boolean;
  hasUserOverride: boolean;
  theme: ThemeColors;
  toggleTheme: () => void;
  setDarkMode: (enabled: boolean) => void;
  setLightMode: () => void;
  resetToSystemTheme: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      // 1. On first run, follow device's system theme
      isDarkMode: getSystemIsDark(),
      hasUserOverride: false,
      theme: getSystemIsDark() ? darkTheme : lightTheme,

      // 2. When user toggles theme, save explicit choice forever
      toggleTheme: () =>
        set((state) => {
          const nextMode = !state.isDarkMode;
          return {
            isDarkMode: nextMode,
            hasUserOverride: true,
            theme: nextMode ? darkTheme : lightTheme,
          };
        }),

      setDarkMode: (enabled: boolean) =>
        set(() => ({
          isDarkMode: enabled,
          hasUserOverride: true,
          theme: enabled ? darkTheme : lightTheme,
        })),

      setLightMode: () =>
        set(() => ({
          isDarkMode: false,
          hasUserOverride: true,
          theme: lightTheme,
        })),

      resetToSystemTheme: () => {
        const isDark = getSystemIsDark();
        set(() => ({
          isDarkMode: isDark,
          hasUserOverride: false,
          theme: isDark ? darkTheme : lightTheme,
        }));
      },
    }),
    {
      name: '@finora_theme_preference_v2',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        isDarkMode: state.isDarkMode,
        hasUserOverride: state.hasUserOverride,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // If user previously chose a theme, restore it; otherwise use system theme
          if (!state.hasUserOverride) {
            const systemIsDark = getSystemIsDark();
            state.isDarkMode = systemIsDark;
            state.theme = systemIsDark ? darkTheme : lightTheme;
          } else {
            state.theme = state.isDarkMode ? darkTheme : lightTheme;
          }
        }
      },
    }
  )
);

// Listen to Android / iOS system theme changes if user hasn't overridden it
Appearance.addChangeListener(({ colorScheme }) => {
  const store = useThemeStore.getState();
  if (!store.hasUserOverride) {
    const isDark = colorScheme === 'dark';
    useThemeStore.setState({
      isDarkMode: isDark,
      theme: isDark ? darkTheme : lightTheme,
    });
  }
});