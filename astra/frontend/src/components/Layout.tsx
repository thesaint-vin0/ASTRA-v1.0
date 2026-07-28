import { Outlet, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Sidebar from './Sidebar'
import TitleBar from './TitleBar'
import NotificationCenter from './NotificationCenter'
import ToastContainer from './Toast'
import CommandPalette from './CommandPalette'
import { useAppStore } from '../stores/appStore'
import { useOnboardingStore } from '../stores/onboardingStore'

export default function Layout() {
  const { sidebarOpen, isConnected } = useAppStore()
  const { isFirstRun } = useOnboardingStore()
  const location = useLocation()

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[rgb(var(--color-bg))]">
      <TitleBar />
      <div className="flex flex-1 overflow-hidden">
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 224, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="flex-shrink-0 overflow-hidden"
            >
              <Sidebar />
            </motion.div>
          )}
        </AnimatePresence>

        <main className="flex-1 overflow-auto scrollbar-thin">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="min-h-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Floating elements */}
      <NotificationCenter />
      <ToastContainer />
      <CommandPalette />

      {/* Connection status indicator */}
      {!isConnected && (
        <div className="fixed bottom-4 left-4 z-50">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-xs text-red-500">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            Disconnected from backend
          </div>
        </div>
      )}
    </div>
  )
}

