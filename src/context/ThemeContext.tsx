import React, { createContext, useContext } from 'react';
import { ThemeColors } from '../constants/theme';
import { useThemeStore } from '../store/useThemeStore';

interface ThemeContextType {
  isDarkMode: boolean;
  theme: ThemeColors;
  toggleTheme: () => void;
  setDarkMode: (enabled: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType>({} as ThemeContextType);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isDarkMode = useThemeStore((state) => state.isDarkMode);
  const theme = useThemeStore((state) => state.theme);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);
  const setDarkMode = useThemeStore((state) => state.setDarkMode);

  const contextValue = React.useMemo(
    () => ({
      isDarkMode,
      theme,
      toggleTheme,
      setDarkMode,
    }),
    [isDarkMode, theme, toggleTheme, setDarkMode]
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
