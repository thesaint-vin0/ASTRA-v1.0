import React, { useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MotionConfig } from 'framer-motion'
import App from './App'
import ErrorBoundary from './components/ErrorBoundary'
import ToastContainer, { showToast } from './components/Toast'
import wsService from './services/websocket'
import { useAppStore } from './stores/appStore'
import './styles/globals.css'

// axe-core accessibility audit — DEVELOPMENT ONLY.
// The audit engine is dynamically imported and never ships in production
// bundles. It logs violations to the console in dev builds for immediate
// feedback while working. The DevDiagnostics page exposes an interactive
// audit panel for on-demand WCAG checks.
async function setupDevAccessibilityAudit() {
  if (import.meta.env.PROD) return
  const ReactAxe = (await import('@axe-core/react')).default
  ReactAxe(React, ReactDOM, 1000)
}

// In dev, auto-run the audit once the app is interactive so violations are
// visible in the console. Failures are logged, never thrown.
if (import.meta.env.DEV) {
  window.addEventListener('load', () => {
    setupDevAccessibilityAudit().catch((err) => {
      console.warn('[a11y] axe-core audit failed to initialize:', err)
    })
  })
}

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
            <MotionConfig reducedMotion="user">
              <App />
              <ToastContainer />
            </MotionConfig>
          </ErrorBoundary>
        </BrowserRouter>
      </QueryClientProvider>
    </React.StrictMode>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(<Root />)

