import api from './api';

export const authService = {
  signup: async (name, email, password) => {
    const { data } = await api.post('/auth/signup', { name, email, password });
    return data;
  },

  login: async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    return data;
  },

  googleLogin: async (credential) => {
    const { data } = await api.post('/auth/google', { credential });
    return data;
  },

  getMe: async () => {
    const { data } = await api.get('/auth/me');
    return data;
  },

  profileSetup: async (workspaceType, phoneNumber) => {
    const { data } = await api.put('/auth/profile-setup', { workspaceType, phoneNumber });
    return data;
  },

  updatePreferences: async (preferences) => {
    const { data } = await api.put('/auth/preferences', preferences);
    return data;
  }
};
