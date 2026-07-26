import { create } from 'zustand'

export type SidebarView = 'chat' | 'memory' | 'models' | 'files' | 'plugins' | 'settings'

interface AppState {
  sidebarOpen: boolean
  sidebarView: SidebarView
  isConnected: boolean
  notifications: Array<{ id: string; type: 'info' | 'success' | 'warning' | 'error'; message: string }>

  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  setSidebarView: (view: SidebarView) => void
  setConnected: (connected: boolean) => void
  addNotification: (type: AppState['notifications'][0]['type'], message: string) => void
  removeNotification: (id: string) => void
}

export const useAppStore = create<AppState>((set) => ({
  sidebarOpen: true,
  sidebarView: 'chat',
  isConnected: false,
  notifications: [],

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setSidebarView: (view) => set({ sidebarView: view }),
  setConnected: (connected) => set({ isConnected: connected }),
  addNotification: (type, message) =>
    set((state) => ({
      notifications: [
        ...state.notifications,
        { id: Date.now().toString(), type, message },
      ],
    })),
  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),
}))
