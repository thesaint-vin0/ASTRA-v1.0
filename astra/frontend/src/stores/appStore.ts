import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type SidebarView = 'chat' | 'memory' | 'models' | 'files' | 'plugins' | 'settings'
export type ThemeMode = 'dark' | 'light' | 'custom'
export type ViewMode = 'grid' | 'list'

interface Notification {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message?: string
  duration?: number
}

interface AppState {
  // Sidebar
  sidebarOpen: boolean
  sidebarView: SidebarView
  sidebarCollapsed: boolean

  // Connection
  isConnected: boolean
  isBackendReady: boolean

  // Notifications
  notifications: Notification[]

  // View preferences
  viewMode: ViewMode

  // Session
  lastActiveAt: string | null
  sessionStart: string | null

  // Actions
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  setSidebarView: (view: SidebarView) => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setConnected: (connected: boolean) => void
  setBackendReady: (ready: boolean) => void
  addNotification: (type: Notification['type'], title: string, message?: string, duration?: number) => void
  removeNotification: (id: string) => void
  clearNotifications: () => void
  setViewMode: (mode: ViewMode) => void
  touchSession: () => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      sidebarView: 'chat',
      sidebarCollapsed: false,
      isConnected: false,
      isBackendReady: false,
      notifications: [],
      viewMode: 'grid',
      lastActiveAt: null,
      sessionStart: new Date().toISOString(),

      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setSidebarView: (view) => set({ sidebarView: view }),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      setConnected: (connected) => set({ isConnected: connected }),
      setBackendReady: (ready) => set({ isBackendReady: ready }),

      addNotification: (type, title, message, duration = 4000) =>
        set((state) => ({
          notifications: [
            ...state.notifications,
            { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5), type, title, message, duration },
          ],
        })),

      removeNotification: (id) =>
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        })),

      clearNotifications: () => set({ notifications: [] }),
      setViewMode: (mode) => set({ viewMode: mode }),

      touchSession: () => set({ lastActiveAt: new Date().toISOString() }),
    }),
    {
      name: 'astra-app',
      partialize: (state) => ({
        sidebarOpen: state.sidebarOpen,
        sidebarView: state.sidebarView,
        sidebarCollapsed: state.sidebarCollapsed,
        viewMode: state.viewMode,
      }),
    }
  )
)

