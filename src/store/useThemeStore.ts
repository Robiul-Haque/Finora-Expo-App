import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';
import { ThemeColors, lightTheme, darkTheme } from '../constants/theme';

export const THEME_STORAGE_KEY = '@finora_theme_preference_v2';

// Detect initial system theme on device
const getSystemIsDark = (): boolean => {
  const scheme = Appearance.getColorScheme();
  return scheme === 'dark';
};

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
      // 1. Initial state before storage hydration
      isDarkMode: getSystemIsDark(),
      hasUserOverride: false,
      isHydrated: false,
      theme: getSystemIsDark() ? darkTheme : lightTheme,

      // 2. When user toggles theme, save explicit choice forever
      toggleTheme: () =>
        set((state) => {
          const nextMode = !state.isDarkMode;
          const nextTheme = nextMode ? darkTheme : lightTheme;
          // Asynchronously ensure storage write
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
        const isDark = getSystemIsDark();
        AsyncStorage.setItem(
          THEME_STORAGE_KEY,
          JSON.stringify({
            state: { isDarkMode: isDark, hasUserOverride: false },
            version: 0,
          })
        ).catch(() => {});

        set(() => ({
          isDarkMode: isDark,
          hasUserOverride: false,
          theme: isDark ? darkTheme : lightTheme,
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
        if (!error && state) {
          if (!state.hasUserOverride) {
            const systemIsDark = getSystemIsDark();
            useThemeStore.setState({
              isDarkMode: systemIsDark,
              hasUserOverride: false,
              isHydrated: true,
              theme: systemIsDark ? darkTheme : lightTheme,
            });
          } else {
            useThemeStore.setState({
              isDarkMode: state.isDarkMode,
              hasUserOverride: true,
              isHydrated: true,
              theme: state.isDarkMode ? darkTheme : lightTheme,
            });
          }
        } else {
          useThemeStore.setState({ isHydrated: true });
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
      if (savedState && typeof savedState.isDarkMode === 'boolean') {
        const isDark = savedState.isDarkMode;
        const hasOverride = Boolean(savedState.hasUserOverride);
        useThemeStore.setState({
          isDarkMode: isDark,
          hasUserOverride: hasOverride,
          isHydrated: true,
          theme: isDark ? darkTheme : lightTheme,
        });
        return true;
      }
    }
  } catch (e) {
    console.warn('Theme preloader error:', e);
  }
  useThemeStore.setState({ isHydrated: true });
  return false;
}

// Proactive immediate load
initializeThemeSync();

// Listen to Android / iOS system theme changes ONLY if user hasn't chosen an explicit theme
Appearance.addChangeListener(({ colorScheme }) => {
  const store = useThemeStore.getState();
  if (store.isHydrated && !store.hasUserOverride) {
    const isDark = colorScheme === 'dark';
    useThemeStore.setState({
      isDarkMode: isDark,
      theme: isDark ? darkTheme : lightTheme,
    });
  }
});