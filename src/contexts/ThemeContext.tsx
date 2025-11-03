import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';

const THEME_KEY = '@canary:theme';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface Theme {
  colors: {
    background: string;
    surface: string;
    primary: string;
    text: string;
    textSecondary: string;
    border: string;
    error: string;
    success: string;
    warning: string;
    card: string;
    tabBarBackground: string;
    tabBarInactive: string;
  };
  isDark: boolean;
}

export const lightTheme: Theme = {
  colors: {
    background: '#FFFFFF',      // Clean white background (matches reference app)
    surface: '#FFFFFF',         // White surface (matches reference app)
    primary: '#e53e3e',         // Red accent (matches reference app)
    text: '#111827',            // Dark text (matches reference app)
    textSecondary: '#6B7280',   // Gray text (matches reference app)
    border: '#E5E7EB',          // Light borders
    error: '#e53e3e',           // Red for errors
    success: '#10B981',         // Green for success
    warning: '#F59E0B',         // Yellow for warnings
    card: '#FFFFFF',            // White cards (matches reference app)
    tabBarBackground: '#FFFFFF', // White tab bar
    tabBarInactive: '#6B7280',  // Inactive tab color
  },
  isDark: false,
};

export const darkTheme: Theme = {
  colors: {
    background: '#0B0C10',      // Pure black body background (matches reference app)
    surface: '#0a0a0a',         // Very subtle card backgrounds (matches reference app)
    primary: '#e53e3e',         // Red accent (matches reference app)
    text: '#E0E0DC',            // Gentle off-white text (matches reference app)
    textSecondary: '#A3A3A3',   // Less important labels (matches reference app)
    border: '#333333',          // Darker borders (matches reference app)
    error: '#FF6B6B',           // Softer red for alerts (matches reference app)
    success: '#66FF99',         // Trust signal green (matches reference app)
    warning: '#F59E0B',         // Warning yellow
    card: '#0a0a0a',            // Subtle card background (matches reference app)
    tabBarBackground: '#000000', // Pure black tab bar (matches reference app)
    tabBarInactive: '#808080',  // Muted text (matches reference app)
  },
  isDark: true,
};

interface ThemeContextState {
  theme: Theme;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextState | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [theme, setTheme] = useState<Theme>(
    systemColorScheme === 'dark' ? darkTheme : lightTheme
  );

  // Load theme preference on mount
  useEffect(() => {
    loadThemePreference();
  }, []);

  // Update theme when system color scheme or theme mode changes
  useEffect(() => {
    updateTheme();
  }, [themeMode, systemColorScheme]);

  const loadThemePreference = async () => {
    try {
      const savedMode = await AsyncStorage.getItem(THEME_KEY);
      if (savedMode === 'light' || savedMode === 'dark' || savedMode === 'system') {
        setThemeModeState(savedMode);
      }
    } catch (error) {
      console.error('Failed to load theme preference:', error);
    }
  };

  const updateTheme = () => {
    let newTheme: Theme;

    if (themeMode === 'system') {
      newTheme = systemColorScheme === 'dark' ? darkTheme : lightTheme;
    } else {
      newTheme = themeMode === 'dark' ? darkTheme : lightTheme;
    }

    setTheme(newTheme);
  };

  const setThemeMode = async (mode: ThemeMode) => {
    try {
      await AsyncStorage.setItem(THEME_KEY, mode);
      setThemeModeState(mode);
    } catch (error) {
      console.error('Failed to save theme preference:', error);
    }
  };

  const value: ThemeContextState = {
    theme,
    themeMode,
    setThemeMode,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextState => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
