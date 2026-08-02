import { useState, useEffect, useCallback, lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useThemeStore } from './stores/themeStore'
import { useOnboardingStore } from './stores/onboardingStore'
import { useAppStore } from './stores/appStore'
import ErrorBoundary from './components/ErrorBoundary'
import SplashScreen from './components/SplashScreen'
import OnboardingWizard from './components/OnboardingWizard'
import Layout from './components/Layout'
import LoadingScreen from './components/LoadingScreen'
import wsService from './services/websocket'

// Lazy-loaded page components for code splitting
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Chat = lazy(() => import('./pages/Chat'))
const Login = lazy(() => import('./pages/Login'))
const Settings = lazy(() => import('./pages/Settings'))
const Memory = lazy(() => import('./pages/Memory'))
const Models = lazy(() => import('./pages/Models'))
const Files = lazy(() => import('./pages/Files'))
const Plugins = lazy(() => import('./pages/Plugins'))
const DevDiagnostics = lazy(() => import('./pages/DevDiagnostics'))
const HowAstraWorks = lazy(() => import('./pages/HowAstraWorks'))
const HelpCenter = lazy(() => import('./pages/HelpCenter'))
const Tutorials = lazy(() => import('./pages/Tutorials'))
const NotFound = lazy(() => import('./pages/NotFound'))

function App() {
  const theme = useThemeStore((s) => s.theme)
  const isFirstRun = useOnboardingStore((s) => s.isFirstRun)
  const setConnected = useAppStore((s) => s.setConnected)
  const [showSplash, setShowSplash] = useState(true)
  const [showOnboarding, setShowOnboarding] = useState(false)

// Initialize WebSocket connection on mount
  useEffect(() => {
    wsService.connect()

    // Listen for connection status changes
    const unsubStatus = wsService.onStatus((connected) => {
      setConnected(connected)
    })

    return () => {
      unsubStatus()
    }
  }, [setConnected])

  // "Open with Astra" — drain pending files opened via OS file association
  useEffect(() => {
    if (!window.electronAPI) return

    // Drain any paths that were queued before the renderer was ready
    window.electronAPI.getPendingOpenPaths().then((paths: string[]) => {
      if (paths.length > 0) {
        console.log('[Astra] Processing pending open-with paths:', paths)
        // Paths flow through the common import pipeline
        window.electronAPI?.importFile(paths[0]).catch(console.error)
      }
    })

    // Listen for live file-open events from second instance / macOS open-file
    const unsub = window.electronAPI.onFileOpenWith((filePaths: string[]) => {
      console.log('[Astra] Live open-with event:', filePaths)
      if (filePaths.length > 0) {
        window.electronAPI?.importFile(filePaths[0]).catch(console.error)
      }
    })

    return () => {
      unsub?.()
    }
  }, [])

  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark', 'custom')
    document.documentElement.classList.add(theme)
  }, [theme])

  const handleSplashComplete = useCallback(() => {
    setShowSplash(false)
    if (isFirstRun) {
      setShowOnboarding(true)
    }
    // Deferred initialization: preload secondary route chunks during idle time
    // so subsequent navigation is instant without impacting initial load.
    const preloadRoutes = () => {
      void import('./pages/Memory')
      void import('./pages/Models')
      void import('./pages/Files')
      void import('./pages/Plugins')
      void import('./pages/Settings')
    }
    if ('requestIdleCallback' in window) {
      (window as Window & { requestIdleCallback: (cb: () => void) => number }).requestIdleCallback(() => {
        preloadRoutes()
      })
    } else {
      setTimeout(preloadRoutes, 2000)
    }
  }, [isFirstRun])

  const handleOnboardingComplete = useCallback(() => {
    setShowOnboarding(false)
  }, [])

  // Wrap lazy-loaded routes with Suspense
  const SuspensedPage = ({ children }: { children: React.ReactNode }) => (
    <Suspense fallback={<LoadingScreen message="Loading page..." />}>
      {children}
    </Suspense>
  )

  return (
    <ErrorBoundary>
      {/* Only show splash during initial startup */}
      {showSplash && <SplashScreen onComplete={handleSplashComplete} />}

      {/* Only show onboarding after splash completes and on first run */}
      <AnimatePresence mode="wait">
        {showOnboarding && (
          <motion.div
            key="onboarding"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <OnboardingWizard onComplete={handleOnboardingComplete} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main app - render after splash */}
      {!showSplash && !showOnboarding && (
        <Routes>
          <Route path="/login" element={<SuspensedPage><Login /></SuspensedPage>} />
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<SuspensedPage><Dashboard /></SuspensedPage>} />
            <Route path="chat" element={<SuspensedPage><Chat /></SuspensedPage>} />
            <Route path="chat/:conversationId" element={<SuspensedPage><Chat /></SuspensedPage>} />
            <Route path="memory" element={<SuspensedPage><Memory /></SuspensedPage>} />
            <Route path="models" element={<SuspensedPage><Models /></SuspensedPage>} />
            <Route path="files" element={<SuspensedPage><Files /></SuspensedPage>} />
            <Route path="plugins" element={<SuspensedPage><Plugins /></SuspensedPage>} />
            <Route path="settings" element={<SuspensedPage><Settings /></SuspensedPage>} />
            <Route path="devtools" element={<SuspensedPage><DevDiagnostics /></SuspensedPage>} />
            <Route path="how-it-works" element={<SuspensedPage><HowAstraWorks /></SuspensedPage>} />
            <Route path="help" element={<SuspensedPage><HelpCenter /></SuspensedPage>} />
            <Route path="tutorials" element={<SuspensedPage><Tutorials /></SuspensedPage>} />
          </Route>
          <Route path="*" element={<SuspensedPage><NotFound /></SuspensedPage>} />
        </Routes>
      )}
    </ErrorBoundary>
  )
}

export default App
