import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('etf_user');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  // Load user from localStorage on mount and validate token
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('etf_token');
      if (token) {
        try {
          const data = await authService.getMe();
          setUser(data.user);
          localStorage.setItem('etf_user', JSON.stringify(data.user));
        } catch (error) {
          console.error('[AUTH] Token verification failed on mount:', error);
          localStorage.removeItem('etf_token');
          localStorage.removeItem('etf_user');
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await authService.login(email, password);
    localStorage.setItem('etf_token', data.token);
    localStorage.setItem('etf_user', JSON.stringify(data.user));
    setUser(data.user);
    return data;
  }, []);

  const googleLogin = useCallback(async (credential) => {
    const data = await authService.googleLogin(credential);
    localStorage.setItem('etf_token', data.token);
    localStorage.setItem('etf_user', JSON.stringify(data.user));
    setUser(data.user);
    return data; 
  }, []);

  const signup = useCallback(async (name, email, password) => {
    const data = await authService.signup(name, email, password);
    localStorage.setItem('etf_token', data.token);
    localStorage.setItem('etf_user', JSON.stringify(data.user));
    setUser(data.user);
    return data;
  }, []);

  const completeProfileSetup = useCallback(async (workspaceType, phoneNumber) => {
    const data = await authService.profileSetup(workspaceType, phoneNumber);
    localStorage.setItem('etf_user', JSON.stringify(data.user));
    setUser(data.user);
    return data;
  }, []);

  const updatePreferences = useCallback(async (preferences) => {
    const data = await authService.updatePreferences(preferences);
    localStorage.setItem('etf_user', JSON.stringify(data.user));
    setUser(data.user);
    return data;
  }, []);

  const uploadAvatar = useCallback(async (formData) => {
    const data = await authService.uploadAvatar(formData);
    localStorage.setItem('etf_user', JSON.stringify(data.user));
    setUser(data.user);
    return data;
  }, []);

  const deleteAccount = useCallback(async () => {
    await authService.deleteAccount();
    localStorage.removeItem('etf_token');
    localStorage.removeItem('etf_user');
    setUser(null);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('etf_token');
    localStorage.removeItem('etf_user');
    setUser(null);
  }, []);

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    googleLogin,
    signup,
    completeProfileSetup,
    updatePreferences,
    uploadAvatar,
    deleteAccount,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
