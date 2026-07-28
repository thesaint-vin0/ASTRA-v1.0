import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface SystemCheck {
  python: { status: 'checked' | 'missing' | 'error'; version?: string }
  ollama: { status: 'checked' | 'missing' | 'error'; version?: string }
  models: { status: 'checked' | 'missing' | 'error'; installed: string[] }
  gpu: { status: 'checked' | 'missing' | 'error'; name?: string }
  cpu: { status: 'checked' | 'missing' | 'error'; name?: string }
  ram: { status: 'checked' | 'missing' | 'error'; total_gb?: number }
  disk: { status: 'checked' | 'missing' | 'error'; free_gb?: number }
  internet: { status: 'checked' | 'missing' | 'error' }
  sqlite: { status: 'checked' | 'missing' | 'error' }
  chroma: { status: 'checked' | 'missing' | 'error' }
  whisper: { status: 'checked' | 'missing' | 'error' }
  piper: { status: 'checked' | 'missing' | 'error' }
  playwright: { status: 'checked' | 'missing' | 'error' }
}

export type OnboardingStep =
  | 'welcome'
  | 'system_check'
  | 'model_setup'
  | 'personality'
  | 'memory_config'
  | 'voice_setup'
  | 'permissions'
  | 'complete'

interface OnboardingState {
  isFirstRun: boolean
  currentStep: OnboardingStep
  completedSteps: OnboardingStep[]
  systemCheck: Partial<SystemCheck>
  selectedPersonality: string
  wakeWord: string
  memoryEnabled: boolean
  permissions: Record<string, boolean>
  isLoading: boolean
  error: string | null

  setFirstRun: (value: boolean) => void
  setCurrentStep: (step: OnboardingStep) => void
  completeStep: (step: OnboardingStep) => void
  setSystemCheck: (check: Partial<SystemCheck>) => void
  setSelectedPersonality: (personality: string) => void
  setWakeWord: (word: string) => void
  setMemoryEnabled: (enabled: boolean) => void
  setPermission: (key: string, value: boolean) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  reset: () => void
}

const initialState = {
  isFirstRun: true,
  currentStep: 'welcome' as OnboardingStep,
  completedSteps: [] as OnboardingStep[],
  systemCheck: {},
  selectedPersonality: 'professional',
  wakeWord: 'hey astra',
  memoryEnabled: true,
  permissions: {
    desktop_automation: false,
    file_access: true,
    internet: true,
    vision: false,
    clipboard: false,
    camera: false,
    notifications: true,
    microphone: false,
  },
  isLoading: false,
  error: null,
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      ...initialState,

      setFirstRun: (value) => set({ isFirstRun: value }),
      setCurrentStep: (step) => set({ currentStep: step }),
      completeStep: (step) =>
        set((state) => ({
          completedSteps: state.completedSteps.includes(step)
            ? state.completedSteps
            : [...state.completedSteps, step],
        })),
      setSystemCheck: (check) =>
        set((state) => ({
          systemCheck: { ...state.systemCheck, ...check },
        })),
      setSelectedPersonality: (personality) =>
        set({ selectedPersonality: personality }),
      setWakeWord: (word) => set({ wakeWord: word }),
      setMemoryEnabled: (enabled) => set({ memoryEnabled: enabled }),
      setPermission: (key, value) =>
        set((state) => ({
          permissions: { ...state.permissions, [key]: value },
        })),
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
      reset: () => set(initialState),
    }),
    {
      name: 'astra-onboarding',
      partialize: (state) => ({
        isFirstRun: state.isFirstRun,
        completedSteps: state.completedSteps,
        selectedPersonality: state.selectedPersonality,
        wakeWord: state.wakeWord,
        memoryEnabled: state.memoryEnabled,
        permissions: state.permissions,
      }),
    }
  )
)

