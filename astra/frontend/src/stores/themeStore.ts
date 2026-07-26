import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = 'dark' | 'light' | 'custom'

interface ThemeState {
  theme: Theme
  setTheme: (theme: Theme) => void
  customColors: {
    primary: string
    bg: string
    surface: string
    text: string
  }
  setCustomColors: (colors: Partial<ThemeState['customColors']>) => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'dark',
      setTheme: (theme) => set({ theme }),
      customColors: {
        primary: '#6366f1',
        bg: '#0f172a',
        surface: '#1e293b',
        text: '#f8fafc',
      },
      setCustomColors: (colors) =>
        set((state) => ({
          customColors: { ...state.customColors, ...colors },
        })),
    }),
    {
      name: 'astra-theme',
    }
  )
)
