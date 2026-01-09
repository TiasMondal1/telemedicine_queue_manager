import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PaperProvider } from 'react-native-paper';
import Navigation from './src/navigation';
import { useEffect } from 'react';
import { registerForPushNotifications, setupNotificationListeners } from './src/services/notifications';
import { useAuthStore } from './src/store/authStore';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function AppContent() {
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) {
      // Register for push notifications and setup listeners
      registerForPushNotifications();
      const cleanup = setupNotificationListeners();
      return cleanup;
    }
  }, [isAuthenticated]);

  return (
    <>
      <Navigation />
      <StatusBar style="auto" />
    </>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <PaperProvider>
        <SafeAreaProvider>
          <AppContent />
        </SafeAreaProvider>
      </PaperProvider>
    </QueryClientProvider>
  );
}
