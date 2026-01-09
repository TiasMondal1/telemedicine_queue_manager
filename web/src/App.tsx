import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster, toast } from 'sonner'
import { useEffect } from 'react'
import AppRoutes from './routes'
import { socket } from './services/socket'
import { useAuthStore } from './store/authStore'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
})

function AppContent() {
  const { isAuthenticated } = useAuthStore()

  useEffect(() => {
    if (isAuthenticated) {
      // Listen for real-time notifications
      socket.on('notification', (data: any) => {
        toast.info(data.title, {
          description: data.content,
          duration: 5000,
        })
      })

      socket.on('queue-update', (data: any) => {
        toast.success('Queue Update', {
          description: data.message,
          duration: 4000,
        })
      })

      socket.on('appointment-update', (data: any) => {
        toast.info('Appointment Update', {
          description: data.message,
          duration: 5000,
        })
      })
    }

    return () => {
      socket.off('notification')
      socket.off('queue-update')
      socket.off('appointment-update')
    }
  }, [isAuthenticated])

  return (
    <>
      <AppRoutes />
      <Toaster position="top-right" richColors closeButton />
    </>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
