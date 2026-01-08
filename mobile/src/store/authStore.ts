import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import api from '../services/api';
import { initializeSocket, disconnectSocket } from '../services/socket';
import { setupNotifications, registerDeviceToken } from '../services/notifications';

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
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  initialize: async () => {
    try {
      const userString = await SecureStore.getItemAsync('user');
      const accessToken = await SecureStore.getItemAsync('accessToken');

      if (userString && accessToken) {
        const user = JSON.parse(userString);
        set({ user, isAuthenticated: true });
        
        // Initialize socket
        await initializeSocket();
      }
    } catch (error) {
      console.error('Failed to initialize auth:', error);
    }
  },

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      // Get push notification token
      const pushToken = await setupNotifications();

      const response = await api.post('/auth/login', { 
        email, 
        password,
        deviceToken: pushToken || undefined,
        platform: 'ANDROID', // Will be dynamic based on Platform.OS
      });

      const { user, tokens } = response.data.data;

      // Store tokens securely
      await SecureStore.setItemAsync('accessToken', tokens.accessToken);
      await SecureStore.setItemAsync('refreshToken', tokens.refreshToken);
      await SecureStore.setItemAsync('user', JSON.stringify(user));

      set({
        user,
        isAuthenticated: true,
        isLoading: false,
      });

      // Initialize socket connection
      await initializeSocket();

      // Register device for push notifications
      if (pushToken) {
        await registerDeviceToken(pushToken);
      }
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

  logout: async () => {
    try {
      // Call logout API
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout API error:', error);
    }

    // Disconnect socket
    disconnectSocket();

    // Clear secure storage
    await SecureStore.deleteItemAsync('accessToken');
    await SecureStore.deleteItemAsync('refreshToken');
    await SecureStore.deleteItemAsync('user');

    // Clear state
    set({
      user: null,
      isAuthenticated: false,
      error: null,
    });
  },

  clearError: () => {
    set({ error: null });
  },
}));
