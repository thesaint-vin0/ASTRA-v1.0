import React, { useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import ErrorBoundary from './components/ErrorBoundary'
import ToastContainer, { showToast } from './components/Toast'
import wsService from './services/websocket'
import { useAppStore } from './stores/appStore'
import './styles/globals.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30000,
    },
  },
})

function Root() {
  const setConnected = useAppStore((s) => s.setConnected)

  useEffect(() => {
    // Connect WebSocket
    wsService.connect()

    // Monitor connection status
    const unsub = wsService.onStatus((connected) => {
      setConnected(connected)
      if (connected) {
        showToast({ type: 'success', title: 'Connected to Astra backend' })
      }
    })

    // Periodic health check
    const healthInterval = setInterval(async () => {
      try {
        const res = await fetch('/api/health')
        if (res.ok) {
          setConnected(true)
        }
      } catch {
        setConnected(false)
      }
    }, 15000)

    return () => {
      unsub()
      clearInterval(healthInterval)
    }
  }, [setConnected])

  return (
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ErrorBoundary>
            <App />
            <ToastContainer />
          </ErrorBoundary>
        </BrowserRouter>
      </QueryClientProvider>
    </React.StrictMode>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(<Root />)

