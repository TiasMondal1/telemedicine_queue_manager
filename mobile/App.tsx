import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PaperProvider } from 'react-native-paper';
import Navigation from './src/navigation';
import { useEffect } from 'react';
import { setupNotifications } from './src/services/notifications';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

export default function App() {
  useEffect(() => {
    // Setup push notifications
    setupNotifications();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <PaperProvider>
        <SafeAreaProvider>
          <Navigation />
          <StatusBar style="auto" />
        </SafeAreaProvider>
      </PaperProvider>
    </QueryClientProvider>
  );
}
