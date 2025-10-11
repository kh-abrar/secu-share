import { create } from 'zustand';
import api, { setUnauthorizedHandler } from '@/libs/api';

interface User {
  id: string;
  email: string;
  name?: string;
}

interface Credentials {
  email: string;
  password: string;
  name?: string;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}

interface AuthActions {
  login: (credentials: Credentials) => Promise<void>;
  logout: () => Promise<void>;
  register: (credentials: Credentials) => Promise<void>;
  fetchUser: () => Promise<void>;
  clearError: () => void;
  handleUnauthorized: () => void;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>((set) => ({
  // Initial state
  user: null,
  loading: true, // Start as true to prevent redirect before session check
  error: null,
  isAuthenticated: false,

  // Actions
  login: async (credentials) => {
    set({ loading: true, error: null });
    try {
      await api.post('/auth/login', {
        email: credentials.email,
        password: credentials.password,
      });
      
      // After successful login, fetch user details
      const userResponse = await api.get('/auth/me');
      set({ 
        user: userResponse.data, 
        loading: false, 
        isAuthenticated: true,
        error: null 
      });
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.response?.data?.error || 'Login failed';
      set({ 
        error: errorMessage, 
        loading: false, 
        user: null,
        isAuthenticated: false 
      });
      throw new Error(errorMessage);
    }
  },

  logout: async () => {
    set({ loading: true });
    try {
      await api.post('/auth/logout');
      set({ 
        user: null, 
        loading: false, 
        isAuthenticated: false,
        error: null 
      });
    } catch (err: any) {
      console.error('Logout error:', err);
      // Even if logout fails, clear local state
      set({ 
        user: null, 
        loading: false, 
        isAuthenticated: false,
        error: null 
      });
    }
  },

  register: async (credentials) => {
    set({ loading: true, error: null });
    try {
      await api.post('/auth/register', {
        email: credentials.email,
        password: credentials.password,
        name: credentials.name,
      });
      
      // After successful registration, fetch user details
      const userResponse = await api.get('/auth/me');
      set({ 
        user: userResponse.data, 
        loading: false, 
        isAuthenticated: true,
        error: null 
      });
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.response?.data?.error || 'Registration failed';
      set({ 
        error: errorMessage, 
        loading: false, 
        user: null,
        isAuthenticated: false 
      });
      throw new Error(errorMessage);
    }
  },

  fetchUser: async () => {
    set({ loading: true });
    try {
      const response = await api.get('/auth/me');
      set({ 
        user: response.data, 
        loading: false, 
        isAuthenticated: true,
        error: null 
      });
    } catch (err: any) {
      // User is not authenticated or session expired
      set({ 
        user: null, 
        loading: false, 
        isAuthenticated: false,
        error: null 
      });
    }
  },

  clearError: () => {
    set({ error: null });
  },

  handleUnauthorized: () => {
    // Clear auth state when unauthorized
    set({ 
      user: null, 
      isAuthenticated: false,
      error: 'Your session has expired. Please login again.',
      loading: false
    });
  },
}));

// Set up the unauthorized handler for the API interceptor
setUnauthorizedHandler(() => {
  useAuthStore.getState().handleUnauthorized();
});

