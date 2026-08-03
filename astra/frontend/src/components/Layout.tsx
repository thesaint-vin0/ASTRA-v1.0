import { useRef, useCallback, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useShallow } from 'zustand/react/shallow'
import Sidebar from './Sidebar'
import TitleBar from './TitleBar'
import NotificationCenter from './NotificationCenter'
import ToastContainer from './Toast'
import CommandPalette from './CommandPalette'
import FileDropZone from './FileDropZone'
import MemoryMonitor from './MemoryMonitor'
import { useAppStore } from '../stores/appStore'
import { useChatStore } from '../stores/chatStore'

export default function Layout() {
  const { sidebarOpen, isConnected } = useAppStore(useShallow((s) => ({
    sidebarOpen: s.sidebarOpen,
    isConnected: s.isConnected,
  })))
const isStreaming = useChatStore((s) => s.isStreaming)
  const location = useLocation()
  const mainRef = useRef<HTMLDivElement>(null)
  const streamingRef = useRef(isStreaming)
  streamingRef.current = isStreaming

  const handleSkipToContent = useCallback(() => {
    mainRef.current?.focus()
  }, [])

  // Graceful shutdown: intercept beforeunload while any active task is running
  // so the user is not left with half-finished operations.
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const tasks = useAppStore.getState().activeTasks
      const isBusy = tasks.streaming || tasks.importing || tasks.exporting || tasks.automation || tasks.indexing
      if (!isBusy) return
      e.preventDefault()
      e.returnValue = 'Active tasks are still running. Are you sure you want to quit?'
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [])

  // Wire up active task tracking: chatStore streaming → appStore activeTasks.streaming
  useEffect(() => {
    useAppStore.getState().setActiveTask('streaming', isStreaming)
  }, [isStreaming])

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[rgb(var(--color-bg))]">

      <a href="#main-content" onClick={(e) => { e.preventDefault(); handleSkipToContent(); }} className="skip-nav">
        Skip to main content
      </a>

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

        <main
          ref={mainRef}
          id="main-content"
          className="flex-1 overflow-auto scrollbar-thin focus:outline-none"
          tabIndex={-1}
          role="main"
          aria-label="Main content"
        >
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

      {/* File drop zone overlay */}
      <FileDropZone />

      {/* Memory leak monitor */}
      <MemoryMonitor />

      <NotificationCenter />
      <ToastContainer />
      <CommandPalette />

      {!isConnected && (
        <div className="fixed bottom-4 left-4 z-50" role="status" aria-live="polite">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-xs text-red-500">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" aria-hidden="true" />
            Disconnected from backend
          </div>
        </div>
      )}

      <div aria-live="polite" aria-atomic="true" className="sr-only" />
    </div>
  )
}
