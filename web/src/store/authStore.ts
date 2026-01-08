import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';
import { initializeSocket, disconnectSocket } from '../services/socket';

interface User {
  id: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
  phone: string;
  profilePictureUrl?: string;
  emailVerified: boolean;
  clinicId: string;
  clinic?: {
    id: string;
    name: string;
    timezone: string;
  };
  doctorProfile?: any;
  patientProfile?: any;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  setUser: (user: User) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  refreshProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      setUser: (user) => {
        set({ user, isAuthenticated: true });
      },

      setTokens: (accessToken, refreshToken) => {
        set({ accessToken, refreshToken });
      },

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.post('/auth/login', { email, password });
          const { user, tokens } = response.data.data;

          set({
            user,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            isAuthenticated: true,
            isLoading: false,
          });

          // Initialize socket connection
          initializeSocket();
        } catch (error: any) {
          const errorMessage = error.response?.data?.error || 'Login failed';
          set({ error: errorMessage, isLoading: false });
          throw new Error(errorMessage);
        }
      },

      register: async (data: any) => {
        set({ isLoading: true, error: null });
        try {
          await api.post('/auth/register', data);
          set({ isLoading: false });
        } catch (error: any) {
          const errorMessage = error.response?.data?.error || 'Registration failed';
          set({ error: errorMessage, isLoading: false });
          throw new Error(errorMessage);
        }
      },

      logout: () => {
        // Call logout API
        api.post('/auth/logout').catch(console.error);

        // Disconnect socket
        disconnectSocket();

        // Clear state
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          error: null,
        });
      },

      clearError: () => {
        set({ error: null });
      },

      refreshProfile: async () => {
        try {
          const response = await api.get('/auth/profile');
          const { user } = response.data.data;
          set({ user });
        } catch (error) {
          console.error('Failed to refresh profile:', error);
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
