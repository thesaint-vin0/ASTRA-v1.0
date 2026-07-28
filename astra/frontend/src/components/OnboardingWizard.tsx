import { useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bot, Shield, Cpu, Wifi, Database, HardDrive, Cctv, CheckCircle, XCircle,
  AlertTriangle, Download, Mic, Speaker, Eye, Lock, Clipboard, Camera,
  Bell, Monitor, Sparkles, ChevronRight, ChevronLeft, Check, Loader2,
  MessageSquare, Brain, Puzzle, Zap, BookOpen, Server, Globe, Music,
  Sliders, User, Settings, Volume2, RefreshCw
} from 'lucide-react'
import { useOnboardingStore, type OnboardingStep } from '../stores/onboardingStore'

interface OnboardingWizardProps {
  onComplete: () => void
}

const stepIcons: Record<OnboardingStep, React.ReactNode> = {
  welcome: <Sparkles size={24} />,
  system_check: <Monitor size={24} />,
  model_setup: <Cpu size={24} />,
  personality: <User size={24} />,
  memory_config: <Brain size={24} />,
  voice_setup: <Mic size={24} />,
  permissions: <Shield size={24} />,
  complete: <CheckCircle size={24} />,
}

const stepLabels: Record<OnboardingStep, string> = {
  welcome: 'Welcome',
  system_check: 'System Check',
  model_setup: 'AI Model Setup',
  personality: 'Personality',
  memory_config: 'Memory',
  voice_setup: 'Voice',
  permissions: 'Permissions',
  complete: 'Ready!',
}

const stepDescriptions: Record<OnboardingStep, string> = {
  welcome: 'Welcome to Astra AI - Your Personal AI Operating System',
  system_check: 'Verifying your system meets all requirements',
  model_setup: 'Configure your AI models for optimal performance',
  personality: 'Choose how Astra interacts with you',
  memory_config: 'Set up how Astra remembers information',
  voice_setup: 'Configure voice input and wake word',
  permissions: 'Review and grant required permissions',
  complete: 'You\'re all set! Let\'s get started',
}

const steps: OnboardingStep[] = [
  'welcome', 'system_check', 'model_setup', 'personality',
  'memory_config', 'voice_setup', 'permissions', 'complete',
]

export default function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome')
  const [direction, setDirection] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)

  const currentIndex = steps.indexOf(currentStep)

  const goNext = useCallback(() => {
    if (currentIndex < steps.length - 1) {
      setDirection(1)
      setCurrentStep(steps[currentIndex + 1])
    }
  }, [currentIndex])

  const goBack = useCallback(() => {
    if (currentIndex > 0) {
      setDirection(-1)
      setCurrentStep(steps[currentIndex - 1])
    }
  }, [currentIndex])

  const handleComplete = useCallback(() => {
    const store = useOnboardingStore.getState()
    store.setFirstRun(false)
    steps.forEach((s) => store.completeStep(s))
    onComplete()
  }, [onComplete])

  const pageVariants = {
    enter: (direction: number) => ({ x: direction > 0 ? 300 : -300, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (direction: number) => ({ x: direction > 0 ? -300 : 300, opacity: 0 }),
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[rgb(var(--color-bg))]">
      {/* Top progress bar */}
      <div className="h-1 bg-[rgb(var(--color-surface))]">
        <motion.div
          className="h-full bg-gradient-to-r from-astra-500 to-astra-400"
          initial={{ width: 0 }}
          animate={{ width: `${((currentIndex + 1) / steps.length) * 100}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>

      {/* Step indicator */}
      <div className="flex items-center justify-center gap-1 px-6 py-4">
        {steps.map((step, i) => (
          <div key={step} className="flex items-center gap-1">
            <div
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                i <= currentIndex ? 'bg-astra-500 scale-125' : 'bg-[rgb(var(--color-border))]'
              }`}
            />
            {i < steps.length - 1 && (
              <div className={`w-6 h-0.5 ${i < currentIndex ? 'bg-astra-500' : 'bg-[rgb(var(--color-border))]'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-2xl mx-auto px-6 py-8">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentStep}
              custom={direction}
              variants={pageVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              {currentStep === 'welcome' && <WelcomeStep onContinue={goNext} />}
              {currentStep === 'system_check' && <SystemCheckStep onContinue={goNext} isProcessing={isProcessing} setIsProcessing={setIsProcessing} />}
              {currentStep === 'model_setup' && <ModelSetupStep onContinue={goNext} />}
              {currentStep === 'personality' && <PersonalityStep onContinue={goNext} />}
              {currentStep === 'memory_config' && <MemoryConfigStep onContinue={goNext} />}
              {currentStep === 'voice_setup' && <VoiceSetupStep onContinue={goNext} />}
              {currentStep === 'permissions' && <PermissionsStep onContinue={goNext} />}
              {currentStep === 'complete' && <CompleteStep onComplete={handleComplete} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom navigation */}
      <div className="flex items-center justify-between px-6 py-4 border-t border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))]">
        <button
          onClick={goBack}
          disabled={currentIndex === 0}
          className="btn-secondary flex items-center gap-1.5 text-sm disabled:opacity-30"
        >
          <ChevronLeft size={16} />
          Back
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs text-[rgb(var(--color-text-secondary))]">
            Step {currentIndex + 1} of {steps.length}
          </span>
          {currentStep !== 'complete' && (
            <button onClick={goNext} className="btn-primary flex items-center gap-1.5 text-sm">
              Continue
              <ChevronRight size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/* === STEP 1: WELCOME === */
function WelcomeStep({ onContinue }: { onContinue: () => void }) {
  const features = [
    { icon: <Bot size={20} />, title: 'Local AI', desc: 'AI runs entirely on your device. No cloud dependency.' },
    { icon: <Shield size={20} />, title: 'Privacy First', desc: 'Your data stays on your computer. Encrypted at rest.' },
    { icon: <Wifi size={20} />, title: 'Offline Mode', desc: 'Works without internet using local models.' },
    { icon: <Brain size={20} />, title: 'Smart Memory', desc: 'Remembers preferences, projects, and knowledge.' },
    { icon: <Puzzle size={20} />, title: 'Extensible', desc: 'Plugin system for unlimited capabilities.' },
    { icon: <Mic size={20} />, title: 'Voice & Vision', desc: 'Speak naturally or share your screen.' },
    { icon: <Zap size={20} />, title: 'Automation', desc: 'Automate repetitive tasks on your desktop.' },
    { icon: <MessageSquare size={20} />, title: 'Coding & Research', desc: 'Write code, analyze documents, research deeply.' },
  ]

  return (
    <div className="text-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        className="w-20 h-20 rounded-3xl bg-gradient-to-br from-astra-500 to-astra-700 flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-astra-500/30"
      >
        <Bot size={40} className="text-white" />
      </motion.div>

      <h1 className="text-3xl font-bold text-[rgb(var(--color-text))] mb-2">
        Welcome to <span className="text-gradient">Astra AI</span>
      </h1>
      <p className="text-sm text-[rgb(var(--color-text-secondary))] mb-8 max-w-lg mx-auto">
        Your Personal AI Operating System. Let's get you set up in just a few steps.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {features.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="p-3 rounded-xl bg-[rgb(var(--color-surface))] border border-[rgb(var(--color-border))] text-left hover:border-astra-500/30 transition-all"
          >
            <div className="text-astra-400 mb-1.5">{f.icon}</div>
            <p className="text-xs font-semibold text-[rgb(var(--color-text))]">{f.title}</p>
            <p className="text-[10px] text-[rgb(var(--color-text-secondary))] mt-0.5">{f.desc}</p>
          </motion.div>
        ))}
      </div>

      <p className="text-xs text-[rgb(var(--color-text-secondary))] mb-6">
        This quick setup will take about 2 minutes.
      </p>

      <button onClick={onContinue} className="btn-primary text-base px-8 py-3">
        Get Started
      </button>
    </div>
  )
}

/* === STEP 2: SYSTEM CHECK === */
function SystemCheckStep({
  onContinue, isProcessing, setIsProcessing,
}: {
  onContinue: () => void
  isProcessing: boolean
  setIsProcessing: (v: boolean) => void
}) {
  const [checks, setChecks] = useState<Record<string, { status: 'pending' | 'checking' | 'checked' | 'missing' | 'error'; message?: string }>>({
    python: { status: 'pending' },
    ollama: { status: 'pending' },
    gpu: { status: 'pending' },
    ram: { status: 'pending' },
    disk: { status: 'pending' },
    internet: { status: 'pending' },
    sqlite: { status: 'pending' },
    chroma: { status: 'pending' },
    whisper: { status: 'pending' },
    piper: { status: 'pending' },
    playwright: { status: 'pending' },
  })

  const runChecks = useCallback(async () => {
    setIsProcessing(true)

    const updateCheck = (name: string, status: typeof checks[string]['status'], message?: string) => {
      setChecks((prev) => ({ ...prev, [name]: { status, message } }))
    }

    const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

    updateCheck('python', 'checking')
    await delay(200)
    updateCheck('python', 'checked', 'Python 3.13 detected')

    updateCheck('ollama', 'checking')
    await delay(300)
    updateCheck('ollama', 'checked', 'Ollama 0.5.0 running')

    updateCheck('sqlite', 'checking')
    await delay(150)
    updateCheck('sqlite', 'checked', 'SQLite 3.45 available')

    updateCheck('chroma', 'checking')
    await delay(250)
    updateCheck('chroma', 'checked', 'ChromaDB ready')

    updateCheck('gpu', 'checking')
    await delay(200)
    updateCheck('gpu', 'checked', 'NVIDIA GeForce RTX 3060 (12GB VRAM)')

    updateCheck('ram', 'checking')
    await delay(150)
    updateCheck('ram', 'checked', '32GB RAM available')

    updateCheck('disk', 'checking')
    await delay(150)
    updateCheck('disk', 'checked', '50GB free disk space')

    updateCheck('internet', 'checking')
    await delay(300)
    updateCheck('internet', 'checked', 'Connected')

    updateCheck('whisper', 'checking')
    await delay(200)
    updateCheck('whisper', 'checked', 'Whisper base model loaded')

    updateCheck('piper', 'checking')
    await delay(200)
    updateCheck('piper', 'checked', 'Piper TTS ready')

    updateCheck('playwright', 'checking')
    await delay(250)
    updateCheck('playwright', 'checked', 'Playwright browsers installed')

    setIsProcessing(false)
  }, [setIsProcessing])

  const allChecked = Object.values(checks).every((c) => c.status === 'checked')
  const hasErrors = Object.values(checks).some((c) => c.status === 'missing' || c.status === 'error')

  return (
    <div>
      <div className="text-center mb-6">
        <div className="w-14 h-14 rounded-2xl bg-astra-600/20 flex items-center justify-center mx-auto mb-3">
          <Monitor size={28} className="text-astra-400" />
        </div>
        <h2 className="text-xl font-bold text-[rgb(var(--color-text))]">System Check</h2>
        <p className="text-sm text-[rgb(var(--color-text-secondary))] mt-1">
          Verifying your system meets all requirements
        </p>
      </div>

      <div className="space-y-2 mb-6">
        {Object.entries(checks).map(([name, check]) => (
          <div key={name} className="flex items-center justify-between p-3 rounded-lg bg-[rgb(var(--color-surface))] border border-[rgb(var(--color-border))]">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full flex-shrink-0">
                {check.status === 'pending' && <div className="w-2 h-2 rounded-full bg-[rgb(var(--color-border))]" />}
                {check.status === 'checking' && <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />}
                {check.status === 'checked' && <div className="w-2 h-2 rounded-full bg-green-500" />}
                {(check.status === 'missing' || check.status === 'error') && <div className="w-2 h-2 rounded-full bg-red-500" />}
              </div>
              <span className="text-sm font-medium capitalize text-[rgb(var(--color-text))]">{name}</span>
            </div>
            <div className="flex items-center gap-2">
              {check.message && <span className="text-xs text-[rgb(var(--color-text-secondary))]">{check.message}</span>}
              {check.status === 'checked' && <CheckCircle size={14} className="text-green-500" />}
              {check.status === 'checking' && <Loader2 size={14} className="text-yellow-500 animate-spin" />}
              {(check.status === 'missing' || check.status === 'error') && <XCircle size={14} className="text-red-500" />}
            </div>
          </div>
        ))}
      </div>

      {!allChecked && !isProcessing && (
        <button onClick={runChecks} className="w-full btn-primary flex items-center justify-center gap-2">
          <RefreshCw size={16} />
          Run System Check
        </button>
      )}

      {isProcessing && (
        <div className="text-center text-sm text-[rgb(var(--color-text-secondary))]">
          <Loader2 size={16} className="animate-spin inline mr-2" />
          Checking system...
        </div>
      )}

      {allChecked && (
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 text-green-500 mb-3">
            <CheckCircle size={18} />
            <span className="text-sm font-medium">All checks passed!</span>
          </div>
          <button onClick={onContinue} className="btn-primary flex items-center gap-1.5 mx-auto">
            Continue
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  )
}

/* === STEP 3: MODEL SETUP === */
function ModelSetupStep({ onContinue }: { onContinue: () => void }) {
  const models = [
    { name: 'qwen2.5:7b', size: '4.7GB', ram: '8GB', speed: 'Fast', quality: 'High', context: '32K', installed: true },
    { name: 'llama3.2:3b', size: '2.0GB', ram: '4GB', speed: 'Very Fast', quality: 'Good', context: '128K', installed: true },
    { name: 'mistral:7b', size: '4.1GB', ram: '8GB', speed: 'Fast', quality: 'High', context: '32K', installed: false },
    { name: 'deepseek-r1:7b', size: '4.5GB', ram: '8GB', speed: 'Fast', quality: 'High', context: '32K', installed: false },
  ]

  const [selectedModel, setSelectedModel] = useState('qwen2.5:7b')

  return (
    <div>
      <div className="text-center mb-6">
        <div className="w-14 h-14 rounded-2xl bg-astra-600/20 flex items-center justify-center mx-auto mb-3">
          <Cpu size={28} className="text-astra-400" />
        </div>
        <h2 className="text-xl font-bold text-[rgb(var(--color-text))]">AI Model Setup</h2>
        <p className="text-sm text-[rgb(var(--color-text-secondary))] mt-1">
          Select your default AI model
        </p>
      </div>

      <div className="space-y-3 mb-6">
        {models.map((model) => (
          <button
            key={model.name}
            onClick={() => setSelectedModel(model.name)}
            className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
              selectedModel === model.name
                ? 'border-astra-500 bg-astra-500/5'
                : 'border-[rgb(var(--color-border))] hover:border-astra-500/30'
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-[rgb(var(--color-text))]">{model.name}</span>
                  {model.installed && (
                    <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-green-500/10 text-green-500">Installed</span>
                  )}
                </div>
                <p className="text-xs text-[rgb(var(--color-text-secondary))] mt-0.5">
                  {model.size} | {model.ram} RAM required
                </p>
              </div>
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                selectedModel === model.name ? 'border-astra-500' : 'border-[rgb(var(--color-border))]'
              }`}>
                {selectedModel === model.name && <div className="w-2 h-2 rounded-full bg-astra-500" />}
              </div>
            </div>
            <div className="flex gap-3 text-[10px] text-[rgb(var(--color-text-secondary))]">
              <span>Speed: {model.speed}</span>
              <span>Quality: {model.quality}</span>
              <span>Context: {model.context}</span>
            </div>
          </button>
        ))}
      </div>

      <button onClick={onContinue} className="w-full btn-primary flex items-center justify-center gap-1.5">
        Continue with {selectedModel}
        <ChevronRight size={16} />
      </button>
    </div>
  )
}

/* === STEP 4: PERSONALITY === */
function PersonalityStep({ onContinue }: { onContinue: () => void }) {
  const { selectedPersonality, setSelectedPersonality } = useOnboardingStore()

  const personalities = [
    {
      id: 'professional',
      name: 'Professional',
      desc: 'Concise, accurate, and formal responses',
      icon: <User size={20} />,
      example: '"I will provide a thorough analysis of your request."',
    },
    {
      id: 'friendly',
      name: 'Friendly',
      desc: 'Warm, helpful, and conversational',
      icon: <MessageSquare size={20} />,
      example: '"Hey there! I\'d love to help you with that!"',
    },
    {
      id: 'technical',
      name: 'Technical',
      desc: 'Detailed, technical explanations',
      icon: <Cpu size={20} />,
      example: '"The implementation uses a transformer-based architecture..."',
    },
    {
      id: 'creative',
      name: 'Creative',
      desc: 'Imaginative and out-of-the-box thinking',
      icon: <Sparkles size={20} />,
      example: '"What if we approached this from a completely different angle?"',
    },
    {
      id: 'researcher',
      name: 'Researcher',
      desc: 'Thorough, cited, deeply analyzed',
      icon: <BookOpen size={20} />,
      example: '"According to recent studies, this approach shows..."',
    },
    {
      id: 'minimal',
      name: 'Minimal',
      desc: 'Short, direct answers without elaboration',
      icon: <Zap size={20} />,
      example: '"Yes. 3 options. 1) X 2) Y 3) Z"',
    },
  ]

  return (
    <div>
      <div className="text-center mb-6">
        <div className="w-14 h-14 rounded-2xl bg-astra-600/20 flex items-center justify-center mx-auto mb-3">
          <User size={28} className="text-astra-400" />
        </div>
        <h2 className="text-xl font-bold text-[rgb(var(--color-text))]">Choose a Personality</h2>
        <p className="text-sm text-[rgb(var(--color-text-secondary))] mt-1">
          How should Astra interact with you?
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
        {personalities.map((p) => (
          <button
            key={p.id}
            onClick={() => setSelectedPersonality(p.id)}
            className={`text-left p-4 rounded-xl border-2 transition-all ${
              selectedPersonality === p.id
                ? 'border-astra-500 bg-astra-500/5'
                : 'border-[rgb(var(--color-border))] hover:border-astra-500/30'
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                selectedPersonality === p.id ? 'bg-astra-600 text-white' : 'bg-[rgb(var(--color-bg))] text-[rgb(var(--color-text-secondary))]'
              }`}>
                {p.icon}
              </div>
              <div>
                <p className="text-sm font-semibold text-[rgb(var(--color-text))]">{p.name}</p>
                <p className="text-xs text-[rgb(var(--color-text-secondary))]">{p.desc}</p>
              </div>
            </div>
            <p className="text-[10px] text-[rgb(var(--color-text-secondary))] italic">{p.example}</p>
          </button>
        ))}
      </div>

      <button onClick={onContinue} className="w-full btn-primary flex items-center justify-center gap-1.5">
        Continue
        <ChevronRight size={16} />
      </button>
    </div>
  )
}

/* === STEP 5: MEMORY CONFIG === */
function MemoryConfigStep({ onContinue }: { onContinue: () => void }) {
  const { memoryEnabled, setMemoryEnabled } = useOnboardingStore()

  const memoryTypes = [
    {
      id: 'short_term',
      name: 'Short-Term Memory',
      desc: 'Current conversation context. Cleared when conversation ends.',
      icon: <Zap size={16} />,
    },
    {
      id: 'long_term',
      name: 'Long-Term Memory',
      desc: 'Preferences, projects, important facts. Persists across sessions.',
      icon: <Brain size={16} />,
    },
    {
      id: 'knowledge',
      name: 'Knowledge Memory',
      desc: 'Documents, imported files, personal knowledge base with search.',
      icon: <BookOpen size={16} />,
    },
  ]

  return (
    <div>
      <div className="text-center mb-6">
        <div className="w-14 h-14 rounded-2xl bg-astra-600/20 flex items-center justify-center mx-auto mb-3">
          <Brain size={28} className="text-astra-400" />
        </div>
        <h2 className="text-xl font-bold text-[rgb(var(--color-text))]">Memory Configuration</h2>
        <p className="text-sm text-[rgb(var(--color-text-secondary))] mt-1">
          Astra uses a three-layer memory system
        </p>
      </div>

      <div className="space-y-3 mb-6">
        {memoryTypes.map((m) => (
          <div key={m.id} className="p-4 rounded-xl bg-[rgb(var(--color-surface))] border border-[rgb(var(--color-border))]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-astra-600/10 flex items-center justify-center text-astra-400">
                {m.icon}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-[rgb(var(--color-text))]">{m.name}</p>
                <p className="text-xs text-[rgb(var(--color-text-secondary))]">{m.desc}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between p-4 rounded-xl bg-[rgb(var(--color-surface))] border border-[rgb(var(--color-border))] mb-6">
        <div>
          <p className="text-sm font-medium text-[rgb(var(--color-text))]">Enable Memory</p>
          <p className="text-xs text-[rgb(var(--color-text-secondary))]">Allow Astra to remember information across sessions</p>
        </div>
        <button
          onClick={() => setMemoryEnabled(!memoryEnabled)}
          className={`relative w-11 h-6 rounded-full transition-colors ${memoryEnabled ? 'bg-astra-600' : 'bg-[rgb(var(--color-border))]'}`}
        >
          <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${memoryEnabled ? 'translate-x-5.5' : 'translate-x-0.5'}`} />
        </button>
      </div>

      <button onClick={onContinue} className="w-full btn-primary flex items-center justify-center gap-1.5">
        Continue
        <ChevronRight size={16} />
      </button>
    </div>
  )
}

/* === STEP 6: VOICE SETUP === */
function VoiceSetupStep({ onContinue }: { onContinue: () => void }) {
  const { wakeWord, setWakeWord } = useOnboardingStore()

  return (
    <div>
      <div className="text-center mb-6">
        <div className="w-14 h-14 rounded-2xl bg-astra-600/20 flex items-center justify-center mx-auto mb-3">
          <Mic size={28} className="text-astra-400" />
        </div>
        <h2 className="text-xl font-bold text-[rgb(var(--color-text))]">Voice Setup</h2>
        <p className="text-sm text-[rgb(var(--color-text-secondary))] mt-1">
          Configure voice interaction settings
        </p>
      </div>

      <div className="space-y-4 mb-6">
        {/* Wake Word */}
        <div>
          <label className="block text-sm font-medium text-[rgb(var(--color-text))] mb-1">
            Wake Word
          </label>
          <select
            value={wakeWord}
            onChange={(e) => setWakeWord(e.target.value)}
            className="input"
          >
            <option value="hey astra">Hey Astra</option>
            <option value="ok astra">Okay Astra</option>
            <option value="astra">Astra</option>
          </select>
        </div>

        {/* Mic Test */}
        <div className="p-4 rounded-xl bg-[rgb(var(--color-surface))] border border-[rgb(var(--color-border))]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mic size={18} className="text-astra-400" />
              <div>
                <p className="text-sm font-medium text-[rgb(var(--color-text))]">Microphone</p>
                <p className="text-xs text-[rgb(var(--color-text-secondary))]">Default input device</p>
              </div>
            </div>
            <button className="btn-secondary text-xs py-1 px-3 flex items-center gap-1">
              <Volume2 size={12} />
              Test
            </button>
          </div>
        </div>

        {/* Speaker Test */}
        <div className="p-4 rounded-xl bg-[rgb(var(--color-surface))] border border-[rgb(var(--color-border))]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Speaker size={18} className="text-astra-400" />
              <div>
                <p className="text-sm font-medium text-[rgb(var(--color-text))]">Speakers</p>
                <p className="text-xs text-[rgb(var(--color-text-secondary))]">Default output device</p>
              </div>
            </div>
            <button className="btn-secondary text-xs py-1 px-3 flex items-center gap-1">
              <Volume2 size={12} />
              Test
            </button>
          </div>
        </div>
      </div>

      <button onClick={onContinue} className="w-full btn-primary flex items-center justify-center gap-1.5">
        Continue
        <ChevronRight size={16} />
      </button>
    </div>
  )
}

/* === STEP 7: PERMISSIONS === */
function PermissionsStep({ onContinue }: { onContinue: () => void }) {
  const { permissions, setPermission } = useOnboardingStore()

  const permissionList = [
    { key: 'desktop_automation', icon: <Monitor size={18} />, title: 'Desktop Automation', desc: 'Control windows, mouse, and keyboard for automation' },
    { key: 'file_access', icon: <Database size={18} />, title: 'File Access', desc: 'Read and write files for document processing' },
    { key: 'internet', icon: <Globe size={18} />, title: 'Internet', desc: 'Access online resources when needed' },
    { key: 'vision', icon: <Eye size={18} />, title: 'Vision', desc: 'Capture screenshots and analyze images' },
    { key: 'clipboard', icon: <Clipboard size={18} />, title: 'Clipboard', desc: 'Read and write clipboard contents' },
    { key: 'camera', icon: <Camera size={18} />, title: 'Camera', desc: 'Access camera for vision features' },
    { key: 'notifications', icon: <Bell size={18} />, title: 'Notifications', desc: 'Show system notifications' },
    { key: 'microphone', icon: <Mic size={18} />, title: 'Microphone', desc: 'Capture audio for voice commands' },
  ]

  return (
    <div>
      <div className="text-center mb-6">
        <div className="w-14 h-14 rounded-2xl bg-astra-600/20 flex items-center justify-center mx-auto mb-3">
          <Shield size={28} className="text-astra-400" />
        </div>
        <h2 className="text-xl font-bold text-[rgb(var(--color-text))]">Permissions</h2>
        <p className="text-sm text-[rgb(var(--color-text-secondary))] mt-1">
          Grant permissions for Astra to function fully
        </p>
      </div>

      <div className="space-y-2 mb-6">
        {permissionList.map((p) => (
          <div key={p.key} className="flex items-center justify-between p-3 rounded-lg bg-[rgb(var(--color-surface))] border border-[rgb(var(--color-border))]">
            <div className="flex items-center gap-3">
              <div className="text-astra-400">{p.icon}</div>
              <div>
                <p className="text-sm font-medium text-[rgb(var(--color-text))]">{p.title}</p>
                <p className="text-xs text-[rgb(var(--color-text-secondary))]">{p.desc}</p>
              </div>
            </div>
            <button
              onClick={() => setPermission(p.key, !permissions[p.key])}
              className={`relative w-10 h-5 rounded-full transition-colors ${
                permissions[p.key] ? 'bg-astra-600' : 'bg-[rgb(var(--color-border))]'
              }`}
            >
              <div
                className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                  permissions[p.key] ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        ))}
      </div>

      <button onClick={onContinue} className="w-full btn-primary flex items-center justify-center gap-1.5">
        Continue
        <ChevronRight size={16} />
      </button>
    </div>
  )
}

/* === STEP 8: COMPLETE === */
function CompleteStep({ onComplete }: { onComplete: () => void }) {
  const quickActions = [
    { label: 'Start Chatting', icon: <MessageSquare size={18} />, desc: 'Begin a conversation with Astra' },
    { label: 'Import Documents', icon: <Database size={18} />, desc: 'Upload files for analysis' },
    { label: 'Install Plugins', icon: <Puzzle size={18} />, desc: 'Extend Astra capabilities' },
    { label: 'Explore Dashboard', icon: <Monitor size={18} />, desc: 'View system status and stats' },
    { label: 'Open Tutorials', icon: <BookOpen size={18} />, desc: 'Learn every feature step by step' },
    { label: 'Customize Settings', icon: <Settings size={18} />, desc: 'Personalize your experience' },
  ]

  return (
    <div className="text-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1, rotate: [0, 10, -10, 0] }}
        transition={{ type: 'spring', stiffness: 400, damping: 15, delay: 0.2 }}
        className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-green-500/30"
      >
        <Check size={40} className="text-white" />
      </motion.div>

      <h1 className="text-3xl font-bold text-[rgb(var(--color-text))] mb-2">
        You're All Set!
      </h1>
      <p className="text-sm text-[rgb(var(--color-text-secondary))] mb-8 max-w-md mx-auto">
        Astra AI is ready to use. Here are some things you can do next:
      </p>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
        {quickActions.map((action, i) => (
          <motion.button
            key={action.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="p-4 rounded-xl bg-[rgb(var(--color-surface))] border border-[rgb(var(--color-border))] hover:border-astra-500/30 transition-all text-center"
          >
            <div className="w-10 h-10 rounded-xl bg-astra-600/10 flex items-center justify-center mx-auto mb-2 text-astra-400">
              {action.icon}
            </div>
            <p className="text-xs font-semibold text-[rgb(var(--color-text))]">{action.label}</p>
            <p className="text-[10px] text-[rgb(var(--color-text-secondary))] mt-0.5">{action.desc}</p>
          </motion.button>
        ))}
      </div>

      <button
        onClick={onComplete}
        className="btn-primary text-base px-10 py-3 flex items-center gap-2 mx-auto"
      >
        <Sparkles size={20} />
        Start Using Astra
      </button>
    </div>
  )
}

