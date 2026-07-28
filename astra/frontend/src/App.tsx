import { useState, useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useThemeStore } from './stores/themeStore'
import { useOnboardingStore } from './stores/onboardingStore'
import ErrorBoundary from './components/ErrorBoundary'
import SplashScreen from './components/SplashScreen'
import OnboardingWizard from './components/OnboardingWizard'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Chat from './pages/Chat'
import Login from './pages/Login'
import Settings from './pages/Settings'
import Memory from './pages/Memory'
import Models from './pages/Models'
import Files from './pages/Files'
import Plugins from './pages/Plugins'
import HowAstraWorks from './pages/HowAstraWorks'
import HelpCenter from './pages/HelpCenter'
import Tutorials from './pages/Tutorials'
import NotFound from './pages/NotFound'

function App() {
  const { theme } = useThemeStore()
  const { isFirstRun } = useOnboardingStore()
  const [showSplash, setShowSplash] = useState(true)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const location = useLocation()

  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark', 'custom')
    document.documentElement.classList.add(theme)
  }, [theme])

  const handleSplashComplete = () => {
    setShowSplash(false)
    if (isFirstRun) {
      setShowOnboarding(true)
    }
  }

  const handleOnboardingComplete = () => {
    setShowOnboarding(false)
  }

  return (
    <ErrorBoundary>
      {showSplash && <SplashScreen onComplete={handleSplashComplete} />}

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

      {!showSplash && !showOnboarding && (
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="chat" element={<Chat />} />
            <Route path="chat/:conversationId" element={<Chat />} />
            <Route path="memory" element={<Memory />} />
            <Route path="models" element={<Models />} />
            <Route path="files" element={<Files />} />
            <Route path="plugins" element={<Plugins />} />
            <Route path="settings" element={<Settings />} />
            <Route path="how-it-works" element={<HowAstraWorks />} />
            <Route path="help" element={<HelpCenter />} />
            <Route path="tutorials" element={<Tutorials />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      )}
    </ErrorBoundary>
  )
}

export default App

