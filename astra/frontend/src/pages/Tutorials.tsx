import { useState, useMemo, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageSquare, Mic, Eye, Code, BookOpen, GitBranch,
  Zap, Puzzle, Brain, FileText, Cpu, Cloud, CheckCircle,
  Play, ArrowRight, Clock, BarChart3, Search, Filter,
  Award, RotateCcw, X, ChevronRight, Star
} from 'lucide-react'
import { showToast } from '../components/Toast'
import { useRouteFocus } from '../hooks/useRouteFocus'
import EmptyState from '../components/EmptyState'

interface TutorialStep {
  title: string
  content: string
  action?: string
}

interface Tutorial {
  id: string
  title: string
  description: string
  category: string
  icon: React.ReactNode
  steps: TutorialStep[]
  duration: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  progress?: number
}

interface TutorialProgress {
  tutorialId: string
  currentStep: number
  completed: boolean
  completedAt?: string
  lastAccessedAt: string
  score?: number
}

const TUTORIALS_PROGRESS_KEY = 'astra-tutorials-progress'

const tutorials: Tutorial[] = [
  {
    id: 'chat-basics',
    title: 'Chat Basics',
    description: 'Learn how to chat with Astra effectively',
    category: 'Chat',
    icon: <MessageSquare size={18} />,
    duration: '5 min',
    difficulty: 'beginner',
    steps: [
      { title: 'Open Chat', content: 'Navigate to the Chat page from the sidebar. This is your main interface for conversing with Astra.', action: 'Open /chat' },
      { title: 'Send a Message', content: 'Type your message in the input box and press Enter. Try asking "What can you help me with?"', action: 'Send a message' },
      { title: 'Read the Response', content: 'Watch as Astra streams the response in real-time. You can stop generation anytime.', action: 'Observe streaming' },
      { title: 'Start a New Chat', content: 'Click "New Chat" to start a fresh conversation. Your history is preserved in the sidebar.', action: 'Create new chat' },
    ],
  },
  {
    id: 'voice-commands',
    title: 'Voice Commands',
    description: 'Use voice to interact with Astra hands-free',
    category: 'Voice',
    icon: <Mic size={18} />,
    duration: '5 min',
    difficulty: 'beginner',
    steps: [
      { title: 'Enable Microphone', content: 'Ensure your microphone is connected and permissions are granted in Settings > Voice.', action: 'Check permissions' },
      { title: 'Say the Wake Word', content: 'Say "Hey Astra" followed by your question. The wake word activates voice input mode.', action: 'Say "Hey Astra"' },
      { title: 'Ask a Question', content: 'Speak clearly. For example: "What is the weather today?" or "Set a reminder for tomorrow."', action: 'Speak your question' },
      { title: 'Use Voice in Chat', content: 'Click the mic icon in the chat input to use push-to-talk mode.', action: 'Click mic icon' },
    ],
  },
  {
    id: 'vision-analysis',
    title: 'Vision & Image Analysis',
    description: 'Analyze images and screenshots with Astra',
    category: 'Vision',
    icon: <Eye size={18} />,
    duration: '8 min',
    difficulty: 'intermediate',
    steps: [
      { title: 'Upload an Image', content: 'Drag and drop an image into the chat, or use the image upload button next to the input.', action: 'Upload image' },
      { title: 'Ask About the Image', content: 'Ask questions like "What does this image show?" or "Extract the text from this screenshot."', action: 'Ask question' },
      { title: 'Take a Screenshot', content: 'Use the screenshot command to capture your screen for real-time assistance.', action: 'Take screenshot' },
      { title: 'Analyze Results', content: 'Astra will describe the image, extract text, and answer your questions about the visual content.', action: 'Review analysis' },
    ],
  },
  {
    id: 'coding-assistant',
    title: 'Code Assistant',
    description: 'Write, debug, and refactor code with AI',
    category: 'Coding',
    icon: <Code size={18} />,
    duration: '10 min',
    difficulty: 'intermediate',
    steps: [
      { title: 'Ask for Code', content: 'Ask Astra to write code: "Write a Python function to sort a list of dictionaries by a key."', action: 'Request code' },
      { title: 'Debug Issues', content: 'Paste error messages or buggy code and ask "Why is this not working?"', action: 'Paste error' },
      { title: 'Refactor Code', content: 'Ask "Can you refactor this to be more efficient?" or "Convert this to TypeScript."', action: 'Request refactor' },
      { title: 'Generate Docs', content: 'Ask "Generate documentation for this code" and Astra will create comprehensive docs.', action: 'Generate docs' },
    ],
  },
  {
    id: 'research-mode',
    title: 'Research & Analysis',
    description: 'Deep research and document analysis',
    category: 'Research',
    icon: <BookOpen size={18} />,
    duration: '10 min',
    difficulty: 'intermediate',
    steps: [
      { title: 'Upload Documents', content: 'Upload PDFs, Word docs, or text files for Astra to analyze.', action: 'Upload document' },
      { title: 'Ask Research Questions', content: 'Ask "Summarize this document" or "What are the key findings?"', action: 'Ask questions' },
      { title: 'Compare Documents', content: 'Upload multiple documents and ask "Compare these documents" for analysis.', action: 'Compare docs' },
      { title: 'Save Insights', content: 'Important findings are automatically saved to long-term memory for future reference.', action: 'Review memories' },
    ],
  },
  {
    id: 'planning',
    title: 'Task Planning',
    description: 'Break down complex goals into actionable plans',
    category: 'Planning',
    icon: <GitBranch size={18} />,
    duration: '8 min',
    difficulty: 'intermediate',
    steps: [
      { title: 'Define a Goal', content: 'State your goal clearly: "Plan a 3-day trip to Paris" or "Create a project roadmap."', action: 'State goal' },
      { title: 'Review the Plan', content: 'Astra will break your goal into tasks with dependencies and timelines.', action: 'Review plan' },
      { title: 'Execute Tasks', content: 'Click on each task to execute it. Tools will be used automatically where possible.', action: 'Execute tasks' },
      { title: 'Track Progress', content: 'Monitor completion status and adjust the plan as needed.', action: 'Track progress' },
    ],
  },
  {
    id: 'automation',
    title: 'Desktop Automation',
    description: 'Automate repetitive tasks on your computer',
    category: 'Automation',
    icon: <Zap size={18} />,
    duration: '12 min',
    difficulty: 'advanced',
    steps: [
      { title: 'Grant Permission', content: 'Automation requires explicit permission. Approve it in Settings > Permissions.', action: 'Grant permissions' },
      { title: 'Record a Workflow', content: 'Click "Record" in the Automation Center and perform the actions you want to automate.', action: 'Record workflow' },
      { title: 'Playback', content: 'Save the workflow and play it back. Astra will repeat the recorded actions.', action: 'Play workflow' },
      { title: 'Schedule Tasks', content: 'Set up scheduled automations like "Open my project every morning at 9 AM."', action: 'Schedule task' },
    ],
  },
  {
    id: 'plugins',
    title: 'Installing Plugins',
    description: 'Extend Astra with plugins',
    category: 'Plugins',
    icon: <Puzzle size={18} />,
    duration: '5 min',
    difficulty: 'beginner',
    steps: [
      { title: 'Open Plugin Manager', content: 'Navigate to the Plugins page to see all installed plugins.', action: 'Open plugins' },
      { title: 'Install a Plugin', content: 'Place plugins in the plugins directory or install from the marketplace.', action: 'Install plugin' },
      { title: 'Enable Plugin', content: 'Toggle the plugin on to activate it. Some plugins may require configuration.', action: 'Enable plugin' },
      { title: 'Use Plugin Features', content: 'Installed plugins add new commands and capabilities. Check the plugin docs for details.', action: 'Use plugin' },
    ],
  },
  {
    id: 'memory-management',
    title: 'Managing Memory',
    description: 'Control what Astra remembers',
    category: 'Memory',
    icon: <Brain size={18} />,
    duration: '5 min',
    difficulty: 'beginner',
    steps: [
      { title: 'View Memories', content: 'Open the Memory page to see all stored memories.', action: 'Open memory' },
      { title: 'Search Memories', content: 'Use the search bar to find specific memories by keyword.', action: 'Search memories' },
      { title: 'Clear Memories', content: 'Delete individual memories or clear all data from Settings > Privacy.', action: 'Clear memories' },
      { title: 'Export Memories', content: 'Export your memories as a backup or for transfer to another device.', action: 'Export memories' },
    ],
  },
  {
    id: 'local-ai',
    title: 'Using Local AI',
    description: 'Run AI models on your device',
    category: 'Local AI',
    icon: <Cpu size={18} />,
    duration: '8 min',
    difficulty: 'intermediate',
    steps: [
      { title: 'Check Ollama', content: 'Ensure Ollama is installed and running. Check System Status on the Dashboard.', action: 'Check Ollama' },
      { title: 'Download a Model', content: 'Go to Model Manager and click "Pull" on a model you want to download.', action: 'Download model' },
      { title: 'Switch Default Model', content: 'In Settings > AI, select your preferred default model for responses.', action: 'Set default model' },
      { title: 'Monitor Performance', content: 'Check RAM, VRAM, and response times in the Dashboard system stats.', action: 'Monitor stats' },
    ],
  },
  {
    id: 'cloud-ai',
    title: 'Cloud AI Fallback',
    description: 'Configure cloud AI providers',
    category: 'Cloud AI',
    icon: <Cloud size={18} />,
    duration: '10 min',
    difficulty: 'advanced',
    steps: [
      { title: 'Add API Key', content: 'Go to Settings > AI and add your OpenAI or Anthropic API key.', action: 'Add API key' },
      { title: 'Configure Provider', content: 'Set the base URL and model name for your cloud provider.', action: 'Configure provider' },
      { title: 'Enable Fallback', content: 'Toggle cloud fallback so Astra uses the cloud when local models are overloaded.', action: 'Enable fallback' },
      { title: 'Test Connection', content: 'Send a message to verify cloud connectivity and response quality.', action: 'Test connection' },
    ],
  },
  {
    id: 'documents',
    title: 'Working with Documents',
    description: 'Document intelligence and analysis',
    category: 'Documents',
    icon: <FileText size={18} />,
    duration: '8 min',
    difficulty: 'beginner',
    steps: [
      { title: 'Open File Explorer', content: 'Navigate to Files to browse your computer\'s files.', action: 'Open Files' },
      { title: 'View a Document', content: 'Click on a file to view its contents. Astra supports PDF, DOCX, TXT, and more.', action: 'Open document' },
      { title: 'Analyze Document', content: 'Ask questions about the document content. "Summarize this" or "Find key topics."', action: 'Analyze document' },
      { title: 'Search Across Files', content: 'Use the search bar to find files by name or content across directories.', action: 'Search files' },
    ],
  },
]

const categories = Array.from(new Set(tutorials.map((t) => t.category)))

function loadProgress(): Record<string, TutorialProgress> {
  try {
    const stored = localStorage.getItem(TUTORIALS_PROGRESS_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

function saveProgress(progress: Record<string, TutorialProgress>): void {
  try {
    localStorage.setItem(TUTORIALS_PROGRESS_KEY, JSON.stringify(progress))
  } catch {
    // Storage unavailable
  }
}

export default function Tutorials() {
  const { ref: headingRef } = useRouteFocus()
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [activeTutorial, setActiveTutorial] = useState<string | null>(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [difficultyFilter, setDifficultyFilter] = useState<string | null>(null)
  const [tutorialProgress, setTutorialProgress] = useState<Record<string, TutorialProgress>>(() => loadProgress())
  const [showCertificate, setShowCertificate] = useState<string | null>(null)

  // Sync progress to localStorage on change
  useEffect(() => {
    saveProgress(tutorialProgress)
  }, [tutorialProgress])

  const filteredTutorials = useMemo(() => {
    let result = tutorials

    if (selectedCategory) {
      result = result.filter((t) => t.category === selectedCategory)
    }

    if (difficultyFilter) {
      result = result.filter((t) => t.difficulty === difficultyFilter)
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q)
      )
    }

    return result
  }, [search, selectedCategory, difficultyFilter])

  const tutorial = activeTutorial ? tutorials.find((t) => t.id === activeTutorial) : null

  // Resume or start tutorial
  const handleStartTutorial = useCallback((id: string) => {
    const progress = tutorialProgress[id]
    if (progress && !progress.completed) {
      // Resume where left off
      setCurrentStep(progress.currentStep)
    } else {
      setCurrentStep(0)
    }
    setActiveTutorial(id)
  }, [tutorialProgress])

  const handleNextStep = useCallback(() => {
    if (!tutorial) return

    const newStep = currentStep + 1

    if (newStep < tutorial.steps.length) {
      setCurrentStep(newStep)
      // Save progress
      setTutorialProgress((prev) => ({
        ...prev,
        [tutorial.id]: {
          tutorialId: tutorial.id,
          currentStep: newStep,
          completed: false,
          lastAccessedAt: new Date().toISOString(),
          score: Math.round((newStep / tutorial.steps.length) * 100),
        },
      }))
    } else {
      // Complete tutorial
      const completedTutorial: TutorialProgress = {
        tutorialId: tutorial.id,
        currentStep: 0,
        completed: true,
        completedAt: new Date().toISOString(),
        lastAccessedAt: new Date().toISOString(),
        score: 100,
      }
      setTutorialProgress((prev) => ({
        ...prev,
        [tutorial.id]: completedTutorial,
      }))
      setShowCertificate(tutorial.id)
      setActiveTutorial(null)
      setCurrentStep(0)
    }
  }, [tutorial, currentStep])

  const handlePrevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1)
    }
  }, [currentStep])

  const handleResetProgress = useCallback(() => {
    setTutorialProgress({})
    setShowCertificate(null)
    showToast({ type: 'success', title: 'All tutorial progress has been reset' })
  }, [])

  const completedCount = Object.values(tutorialProgress).filter((p) => p.completed).length

  const difficultyColors = {
    beginner: 'text-green-500 bg-green-500/10',
    intermediate: 'text-yellow-500 bg-yellow-500/10',
    advanced: 'text-red-500 bg-red-500/10',
  }

// Calculate estimated completion
  const getTutorialProgress = (tutorialId: string): TutorialProgress | undefined => {
    return tutorialProgress[tutorialId]
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-bold text-[rgb(var(--color-text))] focus:outline-none">Interactive Tutorials</h1>
        <p className="text-sm text-[rgb(var(--color-text-secondary))] mt-1">
          Step-by-step guides to master every Astra feature
          {completedCount > 0 && ` • ${completedCount}/${tutorials.length} completed`}
        </p>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[rgb(var(--color-text-secondary))]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tutorials..."
            className="input pl-9 text-sm"
            aria-label="Search tutorials"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-text))]">
              <X size={14} />
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Category Filters */}
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
              !selectedCategory && !difficultyFilter
                ? 'bg-astra-600 text-white'
                : 'bg-[rgb(var(--color-surface))] text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-text))]'
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                selectedCategory === cat
                  ? 'bg-astra-600 text-white'
                  : 'bg-[rgb(var(--color-surface))] text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-text))]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        {/* Difficulty Filter */}
        <div className="flex items-center gap-1 border-l border-[rgb(var(--color-border))] pl-3">
          <Filter size={14} className="text-[rgb(var(--color-text-secondary))]" />
          {['beginner', 'intermediate', 'advanced'].map((diff) => (
            <button
              key={diff}
              onClick={() => setDifficultyFilter(difficultyFilter === diff ? null : diff)}
              className={`px-2 py-1 rounded text-[10px] font-medium transition-all capitalize ${
                difficultyFilter === diff
                  ? 'bg-astra-600 text-white'
                  : 'bg-[rgb(var(--color-surface))] text-[rgb(var(--color-text-secondary))]'
              }`}
            >
              {diff}
            </button>
          ))}
        </div>
        {/* Reset progress */}
        {completedCount > 0 && (
          <button
            onClick={handleResetProgress}
            className="btn-ghost text-xs text-red-500 hover:text-red-400 flex items-center gap-1"
            title="Reset all progress"
          >
            <RotateCcw size={12} />
            Reset
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {tutorial ? (
          /* Active Tutorial */
          <motion.div
            key={tutorial.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="card p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-astra-600/20 flex items-center justify-center text-astra-400">
                    {tutorial.icon}
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-[rgb(var(--color-text))]">{tutorial.title}</h2>
                    <p className="text-sm text-[rgb(var(--color-text-secondary))]">{tutorial.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${difficultyColors[tutorial.difficulty]}`}>
                    {tutorial.difficulty}
                  </span>
                  <button
                    onClick={() => setActiveTutorial(null)}
                    className="btn-ghost text-sm"
                  >
                    Exit
                  </button>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-6">
                <div className="flex items-center justify-between text-xs text-[rgb(var(--color-text-secondary))] mb-2">
                  <span>Progress</span>
                  <span>{currentStep + 1} of {tutorial.steps.length}</span>
                </div>
                <div className="h-2 bg-[rgb(var(--color-bg))] rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-astra-500 to-astra-400 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${((currentStep + 1) / tutorial.steps.length) * 100}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>

              {/* Current Step */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="mb-6"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="flex items-center justify-center w-7 h-7 rounded-full bg-astra-600 text-white text-xs font-bold">
                      {currentStep + 1}
                    </span>
                    <h3 className="text-base font-semibold text-[rgb(var(--color-text))]">
                      {tutorial.steps[currentStep].title}
                    </h3>
                    {currentStep === 0 && getTutorialProgress(tutorial.id)?.completed === false && (
                      <span className="text-xs text-astra-400 flex items-center gap-1">
                        <ArrowRight size={10} />
                        Continuing where you left off
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-[rgb(var(--color-text-secondary))] ml-9">
                    {tutorial.steps[currentStep].content}
                  </p>
                  {tutorial.steps[currentStep].action && (
                    <div className="ml-9 mt-2 flex items-center gap-2 text-xs text-astra-400">
                      <Play size={12} />
                      <span>Action: {tutorial.steps[currentStep].action}</span>
                    </div>
                  )}

                  {/* Interactive Demo placeholder */}
                  <div className="ml-9 mt-4 p-3 rounded-lg bg-[rgb(var(--color-bg))] border border-[rgb(var(--color-border))] border-dashed">
                    <p className="text-xs text-[rgb(var(--color-text-secondary))]">
                      💡 Follow the action above to complete this step. Click "Next" when you're done.
                    </p>
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Navigation */}
              <div className="flex items-center justify-between pt-4 border-t border-[rgb(var(--color-border))]">
                <button
                  onClick={handlePrevStep}
                  disabled={currentStep === 0}
                  className="btn-secondary text-sm disabled:opacity-30"
                >
                  Previous
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[rgb(var(--color-text-secondary))]">
                    {currentStep + 1} / {tutorial.steps.length}
                  </span>
                  <button onClick={handleNextStep} className="btn-primary text-sm flex items-center gap-1.5">
                    {currentStep >= tutorial.steps.length - 1 ? (
                      <>
                        <CheckCircle size={14} />
                        Complete
                      </>
                    ) : (
                      <>
                        Next
                        <ArrowRight size={14} />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ) : showCertificate ? (
          /* Completion Certificate */
          <motion.div
            key="certificate"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="card p-8 text-center max-w-lg mx-auto"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1, rotate: [0, -5, 5, 0] }}
              transition={{ type: 'spring', stiffness: 300, damping: 15 }}
              className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-yellow-500/30"
            >
              <Award size={40} className="text-white" />
            </motion.div>

            <h2 className="text-2xl font-bold text-[rgb(var(--color-text))] mb-2">Congratulations!</h2>
            <p className="text-sm text-[rgb(var(--color-text-secondary))] mb-4">
              You've completed the{' '}
              <strong className="text-astra-400">{tutorials.find((t) => t.id === showCertificate)?.title}</strong> tutorial
            </p>

            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="flex items-center gap-1 text-yellow-500">
                <Star size={16} fill="currentColor" />
                <Star size={16} fill="currentColor" />
                <Star size={16} fill="currentColor" />
              </div>
            </div>

            <div className="p-4 rounded-lg bg-[rgb(var(--color-bg))] border border-[rgb(var(--color-border))] mb-6">
              <p className="text-xs text-[rgb(var(--color-text-secondary))]">
                Tutorial completed at {new Date(tutorialProgress[showCertificate]?.completedAt || '').toLocaleString()}
              </p>
            </div>

            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setShowCertificate(null)}
                className="btn-primary"
              >
                Back to Tutorials
              </button>
              <button
                onClick={() => {
                  const completed = showCertificate
                  setShowCertificate(null)
                  setTimeout(() => handleStartTutorial(completed), 100)
                }}
                className="btn-secondary"
              >
                Retake
              </button>
            </div>
          </motion.div>
        ) : (
          /* Tutorial Grid */
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {/* Continue Where You Left Off */}
            {Object.values(tutorialProgress).some((p) => !p.completed && p.currentStep > 0) && (
              <div className="mb-6">
                <h2 className="text-sm font-semibold text-[rgb(var(--color-text))] mb-3 flex items-center gap-2">
                  <ArrowRight size={14} className="text-astra-400" />
                  Continue Learning
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {tutorials
                    .filter((t) => {
                      const p = tutorialProgress[t.id]
                      return p && !p.completed && p.currentStep > 0
                    })
                    .slice(0, 3)
                    .map((tutorial) => {
                      const p = tutorialProgress[tutorial.id]
                      const progressPercent = p ? Math.round((p.currentStep / tutorial.steps.length) * 100) : 0
                      return (
                        <button
                          key={tutorial.id}
                          onClick={() => handleStartTutorial(tutorial.id)}
                          className="card p-3 hover:shadow-md transition-all text-left flex items-center gap-3"
                        >
                          <div className="w-8 h-8 rounded-lg bg-astra-600/10 flex items-center justify-center text-astra-400 flex-shrink-0">
                            {tutorial.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[rgb(var(--color-text))] truncate">{tutorial.title}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="flex-1 h-1 bg-[rgb(var(--color-bg))] rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-astra-500 rounded-full"
                                  style={{ width: `${progressPercent}%` }}
                                />
                              </div>
                              <span className="text-[10px] text-[rgb(var(--color-text-secondary))]">{progressPercent}%</span>
                            </div>
                          </div>
                          <ChevronRight size={14} className="text-[rgb(var(--color-text-secondary))] flex-shrink-0" />
                        </button>
                      )
                    })}
                </div>
              </div>
            )}

            {/* All Tutorials */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTutorials.map((tutorial) => {
                const progress = getTutorialProgress(tutorial.id)
                const isCompleted = progress?.completed ?? false
                const progressPercent = progress && !isCompleted
                  ? Math.round((progress.currentStep / tutorial.steps.length) * 100)
                  : isCompleted ? 100 : 0

                return (
                  <motion.div
                    key={tutorial.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`card p-4 hover:shadow-md transition-all ${
                      isCompleted ? 'border-green-500/30' : ''
                    } ${progressPercent > 0 && !isCompleted ? 'border-astra-500/20' : ''}`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-astra-600/10 flex items-center justify-center text-astra-400">
                          {tutorial.icon}
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-[rgb(var(--color-text))]">{tutorial.title}</h3>
                          <p className="text-xs text-[rgb(var(--color-text-secondary))]">{tutorial.category}</p>
                        </div>
                      </div>
                      {isCompleted && (
                        <CheckCircle size={16} className="text-green-500 flex-shrink-0" />
                      )}
                      {progressPercent > 0 && !isCompleted && (
                        <div className="flex items-center gap-1 text-xs text-astra-400">
                          <BarChart3 size={12} />
                          {progressPercent}%
                        </div>
                      )}
                    </div>

                    <p className="text-xs text-[rgb(var(--color-text-secondary))] mb-3 line-clamp-2">
                      {tutorial.description}
                    </p>

                    {/* Progress bar for in-progress */}
                    {progressPercent > 0 && !isCompleted && (
                      <div className="h-1 bg-[rgb(var(--color-bg))] rounded-full overflow-hidden mb-3">
                        <div
                          className="h-full bg-astra-500 rounded-full"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    )}

                    <div className="flex items-center gap-2 mb-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${difficultyColors[tutorial.difficulty]}`}>
                        {tutorial.difficulty}
                      </span>
                      <span className="flex items-center gap-1 text-[10px] text-[rgb(var(--color-text-secondary))]">
                        <Clock size={10} />
                        {tutorial.duration}
                      </span>
                      <span className="flex items-center gap-1 text-[10px] text-[rgb(var(--color-text-secondary))]">
                        <BarChart3 size={10} />
                        {tutorial.steps.length} steps
                      </span>
                    </div>

                    <button
                      onClick={() => handleStartTutorial(tutorial.id)}
                      className="w-full btn-primary text-xs py-1.5 flex items-center justify-center gap-1"
                    >
                      <Play size={12} />
                      {isCompleted ? 'Retake Tutorial' : progressPercent > 0 ? 'Continue' : 'Start Tutorial'}
                    </button>
                  </motion.div>
                )
              })}

              {filteredTutorials.length === 0 && (
                <div className="col-span-full">
                  <EmptyState
                    icon={<BookOpen size={32} />}
                    title="No tutorials found"
                    description="Try adjusting your search or filters"
                    compact
                  />
                  <div className="text-center">
                    <button
                      onClick={() => { setSearch(''); setSelectedCategory(null); setDifficultyFilter(null) }}
                      className="text-xs text-astra-400 mt-2 hover:text-astra-300"
                    >
                      Clear filters
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export { tutorials }

