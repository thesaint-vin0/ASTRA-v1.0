import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { TutorialProgress } from '../types'

interface TutorialState {
  progresses: Record<string, TutorialProgress>
  getProgress: (tutorialId: string) => TutorialProgress | undefined
  setProgress: (tutorialId: string, currentStep: number, completed?: boolean) => void
  markCompleted: (tutorialId: string) => void
  getCompletedCount: () => number
  getContinueTutorial: () => TutorialProgress | undefined
  resetProgress: (tutorialId?: string) => void
}

export const useTutorialStore = create<TutorialState>()(
  persist(
    (set, get) => ({
      progresses: {},

      getProgress: (tutorialId) => {
        return get().progresses[tutorialId]
      },

      setProgress: (tutorialId, currentStep, completed = false) =>
        set((state) => ({
          progresses: {
            ...state.progresses,
            [tutorialId]: {
              tutorialId,
              currentStep,
              completed,
              completedAt: completed ? new Date().toISOString() : state.progresses[tutorialId]?.completedAt,
              lastAccessedAt: new Date().toISOString(),
            },
          },
        })),

      markCompleted: (tutorialId) =>
        set((state) => ({
          progresses: {
            ...state.progresses,
            [tutorialId]: {
              tutorialId,
              currentStep: 0,
              completed: true,
              completedAt: new Date().toISOString(),
              lastAccessedAt: new Date().toISOString(),
            },
          },
        })),

      getCompletedCount: () => {
        return Object.values(get().progresses).filter((p) => p.completed).length
      },

      getContinueTutorial: () => {
        const progresses = Object.values(get().progresses)
        const inProgress = progresses
          .filter((p) => !p.completed && p.currentStep > 0)
          .sort((a, b) => new Date(b.lastAccessedAt).getTime() - new Date(a.lastAccessedAt).getTime())
        return inProgress[0]
      },

      resetProgress: (tutorialId) =>
        set((state) => {
          if (tutorialId) {
            const { [tutorialId]: _, ...rest } = state.progresses
            return { progresses: rest }
          }
          return { progresses: {} }
        }),
    }),
    {
      name: 'astra-tutorial-progress',
      partialize: (state) => ({
        progresses: state.progresses,
      }),
    }
  )
)
