import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeColors, lightTheme, darkTheme } from '../constants/theme';

export const THEME_STORAGE_KEY = '@finora_theme_preference_v3';

interface ThemeState {
  isDarkMode: boolean;
  hasUserOverride: boolean;
  isHydrated: boolean;
  theme: ThemeColors;
  toggleTheme: () => void;
  setDarkMode: (enabled: boolean) => void;
  setLightMode: () => void;
  resetToSystemTheme: () => void;
  setHydrated: (hydrated: boolean) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      // 1. Initial default state: ALWAYS Light Theme on first install
      isDarkMode: false,
      hasUserOverride: false,
      isHydrated: false,
      theme: lightTheme,

      // 2. When user toggles theme, save explicit choice forever
      toggleTheme: () =>
        set((state) => {
          const nextMode = !state.isDarkMode;
          const nextTheme = nextMode ? darkTheme : lightTheme;
          AsyncStorage.setItem(
            THEME_STORAGE_KEY,
            JSON.stringify({
              state: { isDarkMode: nextMode, hasUserOverride: true },
              version: 0,
            })
          ).catch(() => {});

          return {
            isDarkMode: nextMode,
            hasUserOverride: true,
            theme: nextTheme,
          };
        }),

      setDarkMode: (enabled: boolean) =>
        set(() => {
          const nextTheme = enabled ? darkTheme : lightTheme;
          AsyncStorage.setItem(
            THEME_STORAGE_KEY,
            JSON.stringify({
              state: { isDarkMode: enabled, hasUserOverride: true },
              version: 0,
            })
          ).catch(() => {});

          return {
            isDarkMode: enabled,
            hasUserOverride: true,
            theme: nextTheme,
          };
        }),

      setLightMode: () =>
        set(() => {
          AsyncStorage.setItem(
            THEME_STORAGE_KEY,
            JSON.stringify({
              state: { isDarkMode: false, hasUserOverride: true },
              version: 0,
            })
          ).catch(() => {});

          return {
            isDarkMode: false,
            hasUserOverride: true,
            theme: lightTheme,
          };
        }),

      resetToSystemTheme: () => {
        AsyncStorage.setItem(
          THEME_STORAGE_KEY,
          JSON.stringify({
            state: { isDarkMode: false, hasUserOverride: false },
            version: 0,
          })
        ).catch(() => {});

        set(() => ({
          isDarkMode: false,
          hasUserOverride: false,
          theme: lightTheme,
        }));
      },

      setHydrated: (hydrated: boolean) => set({ isHydrated: hydrated }),
    }),
    {
      name: THEME_STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        isDarkMode: state.isDarkMode,
        hasUserOverride: state.hasUserOverride,
      }),
      onRehydrateStorage: () => (state, error) => {
        if (!error && state && state.hasUserOverride && typeof state.isDarkMode === 'boolean') {
          // User previously changed theme: restore user's exact chosen theme
          useThemeStore.setState({
            isDarkMode: state.isDarkMode,
            hasUserOverride: true,
            isHydrated: true,
            theme: state.isDarkMode ? darkTheme : lightTheme,
          });
        } else {
          // First time install: always default to Light Theme
          useThemeStore.setState({
            isDarkMode: false,
            hasUserOverride: false,
            isHydrated: true,
            theme: lightTheme,
          });
        }
      },
    }
  )
);

/**
 * Explicit Theme Preloader for Zero-Flash Startup
 */
export async function initializeThemeSync(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(THEME_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const savedState = parsed?.state;
      if (savedState && savedState.hasUserOverride && typeof savedState.isDarkMode === 'boolean') {
        const isDark = savedState.isDarkMode;
        useThemeStore.setState({
          isDarkMode: isDark,
          hasUserOverride: true,
          isHydrated: true,
          theme: isDark ? darkTheme : lightTheme,
        });
        return true;
      }
    }
  } catch (e) {
    console.warn('Theme preloader error:', e);
  }
  // Default to light theme on fresh install
  useThemeStore.setState({
    isDarkMode: false,
    hasUserOverride: false,
    isHydrated: true,
    theme: lightTheme,
  });
  return false;
}

// Proactive immediate load
initializeThemeSync();