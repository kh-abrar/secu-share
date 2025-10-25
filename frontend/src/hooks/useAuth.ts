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
  loading: true,   // prevent redirect before session check
  error: null,
  isAuthenticated: false,

  // ---- LOGIN ----
  login: async (credentials) => {
    set({ loading: true, error: null });

    try {
      await api.post(
        "/auth/login",
        credentials,
        { withCredentials: true }
      );

      // fetch user after login
      const userResponse = await api.get("/auth/me", { withCredentials: true });

      set({
        user: userResponse.data,
        loading: false,
        isAuthenticated: true,
        error: null
      });

    } catch (err: any) {
      const message =
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Login failed";

      set({
        error: message,
        loading: false,
        user: null,
        isAuthenticated: false
      });

      throw new Error(message);
    }
  },

  // ---- LOGOUT ----
  logout: async () => {
    set({ loading: true });
    try {
      await api.post("/auth/logout", {}, { withCredentials: true });
    } catch (err) {
      console.warn("Logout still clearing local state");
    }

    set({
      user: null,
      loading: false,
      isAuthenticated: false,
      error: null
    });
  },

  // ---- REGISTER ----
  register: async (credentials) => {
    set({ loading: true, error: null });

    try {
      await api.post(
        "/auth/register",
        credentials,
        { withCredentials: true }
      );

      // fetch user after register
      const userResponse = await api.get("/auth/me", { withCredentials: true });

      set({
        user: userResponse.data,
        loading: false,
        isAuthenticated: true,
        error: null
      });

    } catch (err: any) {
      const message =
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Registration failed";

      set({
        error: message,
        loading: false,
        user: null,
        isAuthenticated: false
      });

      throw new Error(message);
    }
  },

  // ---- FETCH USER ----
  fetchUser: async () => {
    try {
      const response = await api.get("/auth/me", { withCredentials: true });
      set({
        user: response.data,
        loading: false,
        isAuthenticated: true,
        error: null
      });
    } catch (err) {
      set({
        user: null,
        loading: false,
        isAuthenticated: false,
        error: null
      });
    }
  },

  // ---- CLEAR ERROR ----
  clearError: () => set({ error: null }),

  // ---- SESSION EXPIRED ----
  handleUnauthorized: () => {
    set({
      user: null,
      isAuthenticated: false,
      error: "Session expired. Please login again.",
      loading: false
    });
  }
}));

// Connect API unauthorized interceptor to store
setUnauthorizedHandler(() => {
  useAuthStore.getState().handleUnauthorized();
});
