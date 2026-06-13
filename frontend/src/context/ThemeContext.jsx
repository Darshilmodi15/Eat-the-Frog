import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import api from '../services/api';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  
  // Initialize theme from user preference, fallback to localStorage, then default to 'system'
  const [theme, setTheme] = useState(() => {
    if (user?.theme) return user.theme;
    const saved = localStorage.getItem('etf_theme');
    return saved || 'system';
  });

  // Keep theme in sync if user object changes (e.g. login or updates from other devices)
  useEffect(() => {
    if (user?.theme) {
      setTheme(user.theme);
    }
  }, [user]);

  // Apply theme to document element
  const applyTheme = useCallback((currentTheme) => {
    let resolvedTheme = currentTheme;
    
    if (currentTheme === 'system') {
      resolvedTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    
    document.documentElement.setAttribute('data-theme', resolvedTheme);
  }, []);

  // Set theme attributes on load & change
  useEffect(() => {
    applyTheme(theme);
  }, [theme, applyTheme]);

  // Listen to OS system theme changes
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = () => {
      applyTheme('system');
    };

    // Modern browsers support addEventListener, fallback for older browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleSystemThemeChange);
    } else {
      mediaQuery.addListener(handleSystemThemeChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleSystemThemeChange);
      } else {
        mediaQuery.removeListener(handleSystemThemeChange);
      }
    };
  }, [theme, applyTheme]);

  const changeTheme = useCallback(async (newTheme) => {
    if (!['light', 'dark', 'system'].includes(newTheme)) return;
    
    setTheme(newTheme);
    localStorage.setItem('etf_theme', newTheme);
    
    if (isAuthenticated) {
      try {
        const { data } = await api.put('/auth/preferences', { theme: newTheme });
        // Update user cache in localStorage
        localStorage.setItem('etf_user', JSON.stringify(data.user));
      } catch (error) {
        console.error('[THEME] Failed to save theme preference in database:', error);
      }
    }
  }, [isAuthenticated]);

  const value = {
    theme,
    changeTheme,
    resolvedTheme: theme === 'system' 
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : theme
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
