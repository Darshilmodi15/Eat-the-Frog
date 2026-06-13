import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const { user, isAuthenticated, updatePreferences } = useAuth() || {};
  
  // Initialize theme from user preference, fallback to localStorage, then default to 'system'
  const [theme, setTheme] = useState(() => {
    const savedLocal = localStorage.getItem('etf_theme');
    const savedUser = localStorage.getItem('etf_user');
    let initialUserTheme = null;
    try {
      if (savedUser) {
        initialUserTheme = JSON.parse(savedUser)?.theme;
      }
    } catch (e) {
      console.error('[THEME] Error parsing initial user from localStorage:', e);
    }
    
    const initialTheme = initialUserTheme || savedLocal || 'system';
    console.log('[THEME] Initial theme selection in state:', initialTheme);
    return initialTheme;
  });

  // Keep theme in sync if user object changes (e.g. login, logout, or updates)
  useEffect(() => {
    console.log('[THEME] User object changed. Current user theme:', user?.theme, 'State theme:', theme);
    if (user?.theme) {
      setTheme(user.theme);
    } else if (user === null) {
      // Revert theme to local preferences on logout
      const saved = localStorage.getItem('etf_theme');
      console.log('[THEME] User logged out. Reverting to local theme:', saved || 'system');
      setTheme(saved || 'system');
    }
  }, [user]);

  // Apply theme to document element
  const applyTheme = useCallback((currentTheme) => {
    let resolvedTheme = currentTheme;
    
    if (currentTheme === 'system') {
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      resolvedTheme = systemPrefersDark ? 'dark' : 'light';
      console.log('[THEME] Resolved "system" theme. System prefers dark:', systemPrefersDark, '-> applied:', resolvedTheme);
    } else {
      console.log('[THEME] Resolved static theme -> applied:', resolvedTheme);
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
    const handleSystemThemeChange = (e) => {
      console.log('[THEME] System prefers-color-scheme change detected:', e.matches ? 'dark' : 'light');
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
    
    console.log('[THEME] User explicitly requested theme change to:', newTheme);
    setTheme(newTheme);
    localStorage.setItem('etf_theme', newTheme);
    
    if (isAuthenticated && updatePreferences) {
      try {
        await updatePreferences({ theme: newTheme });
        console.log('[THEME] Successfully saved theme preference to database:', newTheme);
      } catch (error) {
        console.error('[THEME] Failed to save theme preference in database:', error);
      }
    }
  }, [isAuthenticated, updatePreferences]);

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
