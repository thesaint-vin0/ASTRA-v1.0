import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Brain, MessageSquare, Cpu, Network, GitBranch,
  Puzzle, Server, User, ArrowRight, Zap, Activity, BarChart3,
  ArrowDown, ArrowUp, Info, Box, Link2, Gauge, Play, RefreshCw
} from 'lucide-react'

interface PipelineStep {
  id: string
  label: string
  icon: React.ReactNode
  description: string
  purpose: string
  inputs: string[]
  outputs: string[]
  dependencies: string[]
  responsibilities: string[]
  stats: { label: string; value: string }[]
  connectedModules: string[]
}

const pipelineSteps: PipelineStep[] = [
  {
    id: 'user',
    label: 'User Input',
    icon: <User size={20} />,
    description: 'The entry point where users interact with Astra through chat, voice, or vision.',
    purpose: 'Capture and normalize all user input types into a unified format for processing.',
    inputs: ['Text messages', 'Voice audio', 'Images/screenshots', 'File uploads', 'Voice commands'],
    outputs: ['Normalized text', 'Conversation context', 'Input metadata'],
    dependencies: ['Browser/Electron API', 'Microphone', 'File system'],
    responsibilities: [
      'Send text messages and commands',
      'Upload images and documents',
      'Use voice commands',
      'Access conversation history',
    ],
    stats: [
      { label: 'Input Types', value: '5' },
      { label: 'Avg Request Size', value: '2KB' },
    ],
    connectedModules: ['conversation'],
  },
  {
    id: 'conversation',
    label: 'Conversation Engine',
    icon: <MessageSquare size={20} />,
    description: 'Manages conversation flow, context window, message history, and session state.',
    purpose: 'Maintain conversation state, build AI context, and manage message history.',
    inputs: ['User input text', 'Conversation ID', 'Personality config'],
    outputs: ['Formatted context', 'Message history', 'Session state'],
    dependencies: ['Database', 'Context window manager', 'Token counter'],
    responsibilities: [
      'Manage conversation threads',
      'Build AI context from history',
      'Track message tokens and limits',
      'Handle streaming responses',
    ],
    stats: [
      { label: 'Active Conversations', value: '128' },
      { label: 'Max Context', value: '8K tokens' },
    ],
    connectedModules: ['user', 'reasoning', 'memory'],
  },
  {
    id: 'reasoning',
    label: 'Reasoning Engine',
    icon: <Brain size={20} />,
    description: 'Performs chain-of-thought reasoning, multi-step analysis, and logic decomposition.',
    purpose: 'Apply advanced reasoning techniques to understand and solve complex queries.',
    inputs: ['Context from conversation', 'User query', 'Memory results'],
    outputs: ['Reasoned analysis', 'Step-by-step logic', 'Actionable plans'],
    dependencies: ['Conversation Engine', 'Memory Engine', 'Model Manager'],
    responsibilities: [
      'Chain-of-thought reasoning',
      'Logical analysis and deduction',
      'Multi-step problem solving',
      'Deep contextual understanding',
    ],
    stats: [
      { label: 'Reasoning Depth', value: '10 steps' },
      { label: 'Accuracy', value: '94%' },
    ],
    connectedModules: ['conversation', 'planning', 'memory'],
  },
  {
    id: 'planning',
    label: 'Planning Engine',
    icon: <GitBranch size={20} />,
    description: 'Decomposes complex goals into actionable plans with parallel task execution.',
    purpose: 'Break down complex goals into manageable tasks with dependency tracking.',
    inputs: ['Goal description', 'Available tools', 'Resource constraints'],
    outputs: ['Task list', 'Dependency graph', 'Timeline estimate'],
    dependencies: ['Reasoning Engine', 'Tool Manager', 'Resource Monitor'],
    responsibilities: [
      'Task decomposition and ordering',
      'Dependency graph management',
      'Resource allocation',
      'Progress tracking',
    ],
    stats: [
      { label: 'Max Parallel Tasks', value: '10' },
      { label: 'Avg Plan Complexity', value: '8 tasks' },
    ],
    connectedModules: ['reasoning', 'memory', 'tools'],
  },
  {
    id: 'memory',
    label: 'Memory Engine',
    icon: <Network size={20} />,
    description: 'Three-layer memory system combining short-term, long-term, and knowledge storage.',
    purpose: 'Provide persistent context across sessions through a multi-tier memory architecture.',
    inputs: ['Conversation data', 'User preferences', 'Documents/files'],
    outputs: ['Relevant memories', 'Vector search results', 'Memory summaries'],
    dependencies: ['Vector Store (ChromaDB)', 'Database (SQLite)', 'Embedding Model'],
    responsibilities: [
      'Short-term conversation context',
      'Long-term preference storage',
      'Knowledge base management',
      'Semantic vector search',
    ],
    stats: [
      { label: 'Memory Layers', value: '3' },
      { label: 'Vector Store Size', value: '50K docs' },
    ],
    connectedModules: ['conversation', 'reasoning', 'planning'],
  },
  {
    id: 'tools',
    label: 'Tool Manager',
    icon: <Zap size={20} />,
    description: 'Registry and executor for built-in tools, plugins, and custom actions.',
    purpose: 'Discover, execute, and manage tools securely within a sandboxed environment.',
    inputs: ['Tool request', 'Parameters', 'Security context'],
    outputs: ['Tool results', 'Execution logs', 'Status updates'],
    dependencies: ['Plugin Manager', 'Security Manager', 'Automation System'],
    responsibilities: [
      'Tool discovery and registration',
      'Secure execution sandbox',
      'Result aggregation',
      'Permission enforcement',
    ],
    stats: [
      { label: 'Available Tools', value: '25+' },
      { label: 'Avg Latency', value: '150ms' },
    ],
    connectedModules: ['planning', 'plugins', 'model'],
  },
  {
    id: 'plugins',
    label: 'Plugin Manager',
    icon: <Puzzle size={20} />,
    description: 'Extend functionality through a sandboxed plugin system with hot-reload support.',
    purpose: 'Load, manage, and isolate plugins to safely extend Astra capabilities.',
    inputs: ['Plugin packages', 'Config files', 'Dependency specs'],
    outputs: ['Plugin API', 'Lifecycle events', 'Sandboxed runtime'],
    dependencies: ['File System', 'Sandbox Environment', 'Dependency Resolver'],
    responsibilities: [
      'Plugin loading and lifecycle',
      'Sandbox isolation',
      'Dependency resolution',
      'Version management',
    ],
    stats: [
      { label: 'Plugin Types', value: '4' },
      { label: 'Max Plugins', value: '50' },
    ],
    connectedModules: ['tools', 'model'],
  },
  {
    id: 'model',
    label: 'Model Manager',
    icon: <Server size={20} />,
    description: 'Abstracts multiple AI providers (local/cloud) with automatic fallback and failover.',
    purpose: 'Provide a unified interface to multiple AI models with automatic failover.',
    inputs: ['Prompt text', 'Model config', 'Provider credentials'],
    outputs: ['AI response tokens', 'Model metadata', 'Usage stats'],
    dependencies: ['Ollama (local)', 'OpenAI API (cloud)', 'Anthropic API (cloud)'],
    responsibilities: [
      'Multi-provider abstraction',
      'Automatic failover',
      'Context window management',
      'Provider health monitoring',
    ],
    stats: [
      { label: 'Supported Providers', value: '3' },
      { label: 'Max Context', value: '128K tokens' },
    ],
    connectedModules: ['tools', 'plugins', 'response'],
  },
  {
    id: 'response',
    label: 'Response Generator',
    icon: <Activity size={20} />,
    description: 'Formats and streams the final response with citations, tool results, and rich content.',
    purpose: 'Assemble AI output, tool results, and memory data into a coherent response.',
    inputs: ['AI tokens', 'Tool results', 'Memory context'],
    outputs: ['Formatted response', 'Stream chunks', 'Rich content'],
    dependencies: ['Model Manager', 'Tool Manager', 'Markdown Renderer'],
    responsibilities: [
      'Stream token generation',
      'Tool result integration',
      'Cite sources',
      'Format rich responses',
    ],
    stats: [
      { label: 'Avg Response Time', value: '1.2s' },
      { label: 'Stream Rate', value: '50 tok/s' },
    ],
    connectedModules: ['model', 'user'],
  },
]

export default function HowAstraWorks() {
  const [activeStep, setActiveStep] = useState<string | null>(null)
  const [hoveredStep, setHoveredStep] = useState<string | null>(null)
  const [isAnimating, setIsAnimating] = useState(false)
  const [animationStep, setAnimationStep] = useState(0)
  const animationRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Animate the complete pipeline
  const startAnimation = useCallback(() => {
    if (isAnimating) return
    setIsAnimating(true)
    setAnimationStep(0)

    animationRef.current = setInterval(() => {
      setAnimationStep((prev) => {
        if (prev >= pipelineSteps.length - 1) {
          setIsAnimating(false)
          if (animationRef.current) clearInterval(animationRef.current)
          return prev
        }
        return prev + 1
      })
    }, 800)
  }, [isAnimating])

  const stopAnimation = useCallback(() => {
    if (animationRef.current) {
      clearInterval(animationRef.current)
      animationRef.current = null
    }
    setIsAnimating(false)
    setAnimationStep(0)
  }, [])

  useEffect(() => {
    return () => {
      if (animationRef.current) clearInterval(animationRef.current)
    }
  }, [])

  const activeStepData = activeStep ? pipelineSteps.find((s) => s.id === activeStep) : null

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[rgb(var(--color-text))]">How Astra Works</h1>
        <p className="text-sm text-[rgb(var(--color-text-secondary))] mt-1">
          Explore the architecture and processing pipeline of the Astra AI Operating System
        </p>
      </div>

      {/* Pipeline Flow Diagram */}
      <div className="card p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-[rgb(var(--color-text))] flex items-center gap-2">
            <BarChart3 size={18} className="text-astra-400" />
            Processing Pipeline
          </h2>
          <div className="flex items-center gap-2">
            {isAnimating ? (
              <button onClick={stopAnimation} className="btn-secondary text-xs flex items-center gap-1">
                <Activity size={12} />
                Stop
              </button>
            ) : (
              <button onClick={startAnimation} className="btn-primary text-xs flex items-center gap-1">
                <Play size={12} />
                Animate Flow
              </button>
            )}
          </div>
        </div>

        <div className="relative">
          {/* Pipeline Visualization - Desktop */}
          <div className="hidden lg:flex items-center justify-between gap-1 mb-4">
            {pipelineSteps.map((step, i) => (
              <div key={step.id} className="flex-1 flex flex-col items-center relative">
                {/* Connection line between steps */}
                {i < pipelineSteps.length - 1 && (
                  <div className="absolute top-6 left-[60%] w-[80%] h-0.5 z-0">
                    <div className={`w-full h-full transition-colors duration-500 ${
                      isAnimating && i < animationStep ? 'bg-astra-500' : 'bg-[rgb(var(--color-border))]'
                    }`} />
                    {/* Animated dot on connection */}
                    {isAnimating && i < animationStep && (
                      <motion.div
                        className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-astra-400"
                        animate={{ x: [0, 0] }}
                        transition={{ duration: 0.5 }}
                      />
                    )}
                  </div>
                )}

                <motion.button
                  onMouseEnter={() => setHoveredStep(step.id)}
                  onMouseLeave={() => setHoveredStep(null)}
                  onClick={() => setActiveStep(activeStep === step.id ? null : step.id)}
                  className={`relative z-10 w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 ${
                    activeStep === step.id
                      ? 'bg-astra-600 text-white shadow-lg shadow-astra-500/30 scale-110'
                      : hoveredStep === step.id
                      ? 'bg-astra-600/20 text-astra-400 scale-105'
                      : isAnimating && i === animationStep
                      ? 'bg-astra-500 text-white shadow-lg shadow-astra-500/30 scale-110 animate-pulse'
                      : isAnimating && i < animationStep
                      ? 'bg-astra-600/20 text-astra-400 border border-astra-500/30'
                      : 'bg-[rgb(var(--color-surface))] text-[rgb(var(--color-text-secondary))] border border-[rgb(var(--color-border))]'
                  }`}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {step.icon}
                </motion.button>

                <span className={`text-[10px] mt-1.5 text-center font-medium transition-colors max-w-[80px] leading-tight ${
                  activeStep === step.id ? 'text-astra-400' : 'text-[rgb(var(--color-text-secondary))]'
                }`}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>

          {/* Mobile Pipeline List */}
          <div className="lg:hidden space-y-2">
            {pipelineSteps.map((step, i) => (
              <div key={step.id} className="flex items-center gap-2">
                {i > 0 && (
                  <div className="w-0.5 h-4 ml-4 bg-[rgb(var(--color-border))]" />
                )}
                <button
                  onClick={() => setActiveStep(activeStep === step.id ? null : step.id)}
                  className={`flex items-center gap-3 p-3 rounded-lg transition-all flex-1 ${
                    activeStep === step.id ? 'bg-astra-600/10 border border-astra-500/20' : 'hover:bg-[rgb(var(--color-bg))]'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    activeStep === step.id ? 'bg-astra-600 text-white' : 'bg-[rgb(var(--color-surface))] text-[rgb(var(--color-text-secondary))]'
                  }`}>
                    {step.icon}
                  </div>
                  <span className="text-sm font-medium text-[rgb(var(--color-text))] flex-1">{step.label}</span>
                  <ArrowRight size={14} className="text-[rgb(var(--color-text-secondary))]" />
                </button>
              </div>
            ))}
          </div>

          {/* Animated flow indicator */}
          {isAnimating && (
            <div className="mt-4 p-3 rounded-lg bg-astra-500/5 border border-astra-500/20">
              <div className="flex items-center gap-2">
                <span className="text-xs text-astra-400 font-medium">
                  Processing: {pipelineSteps[animationStep]?.label}
                </span>
                <div className="flex gap-0.5 ml-auto">
                  {pipelineSteps.map((_, i) => (
                    <div
                      key={i}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        i <= animationStep ? 'bg-astra-500' : 'bg-[rgb(var(--color-border))]'
                      }`}
                    />
                  ))}
                </div>
              </div>
              <p className="text-xs text-[rgb(var(--color-text-secondary))] mt-1">
                {pipelineSteps[animationStep]?.description}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Detail Panel */}
      <AnimatePresence mode="wait">
        {activeStepData && (
          <motion.div
            key={activeStepData.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="card p-6 mb-6"
          >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Description & Responsibilities */}
              <div className="lg:col-span-2 space-y-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-astra-600 flex items-center justify-center text-white">
                    {activeStepData.icon}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[rgb(var(--color-text))]">{activeStepData.label}</h3>
                    <p className="text-sm text-[rgb(var(--color-text-secondary))]">{activeStepData.description}</p>
                  </div>
                </div>

                {/* Purpose */}
                <div>
                  <h4 className="text-sm font-medium text-[rgb(var(--color-text))] mb-2 flex items-center gap-1.5">
                    <Info size={14} className="text-astra-400" />
                    Purpose
                  </h4>
                  <p className="text-sm text-[rgb(var(--color-text-secondary))]">{activeStepData.purpose}</p>
                </div>

                {/* Inputs & Outputs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-[rgb(var(--color-bg))] rounded-xl p-4">
                    <h4 className="text-xs font-semibold text-[rgb(var(--color-text))] mb-2 flex items-center gap-1.5 uppercase tracking-wider">
                      <ArrowDown size={12} className="text-green-500" />
                      Inputs
                    </h4>
                    <ul className="space-y-1">
                      {activeStepData.inputs.map((input, i) => (
                        <li key={i} className="flex items-center gap-2 text-xs text-[rgb(var(--color-text-secondary))]">
                          <div className="w-1 h-1 rounded-full bg-green-500" />
                          {input}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-[rgb(var(--color-bg))] rounded-xl p-4">
                    <h4 className="text-xs font-semibold text-[rgb(var(--color-text))] mb-2 flex items-center gap-1.5 uppercase tracking-wider">
                      <ArrowUp size={12} className="text-blue-500" />
                      Outputs
                    </h4>
                    <ul className="space-y-1">
                      {activeStepData.outputs.map((output, i) => (
                        <li key={i} className="flex items-center gap-2 text-xs text-[rgb(var(--color-text-secondary))]">
                          <div className="w-1 h-1 rounded-full bg-blue-500" />
                          {output}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Dependencies */}
                <div>
                  <h4 className="text-sm font-medium text-[rgb(var(--color-text))] mb-2 flex items-center gap-1.5">
                    <Link2 size={14} className="text-astra-400" />
                    Dependencies
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {activeStepData.dependencies.map((dep, i) => (
                      <span key={i} className="px-2 py-1 rounded-lg text-xs bg-[rgb(var(--color-surface))] border border-[rgb(var(--color-border))] text-[rgb(var(--color-text-secondary))]">
                        {dep}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Responsibilities */}
                <div>
                  <h4 className="text-sm font-medium text-[rgb(var(--color-text))] mb-2">Key Responsibilities</h4>
                  <ul className="space-y-1.5">
                    {activeStepData.responsibilities.map((r, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-[rgb(var(--color-text-secondary))]">
                        <div className="w-1.5 h-1.5 rounded-full bg-astra-500" />
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Connected Modules */}
                <div>
                  <h4 className="text-sm font-medium text-[rgb(var(--color-text))] mb-2 flex items-center gap-1.5">
                    <Network size={14} className="text-astra-400" />
                    Connected Modules
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {activeStepData.connectedModules.map((modId) => {
                      const mod = pipelineSteps.find((s) => s.id === modId)
                      if (!mod) return null
                      return (
                        <button
                          key={modId}
                          onClick={() => setActiveStep(modId)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-astra-500/10 text-astra-400 hover:bg-astra-500/20 transition-colors"
                        >
                          {mod.icon}
                          {mod.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Performance Stats */}
              <div className="bg-[rgb(var(--color-bg))] rounded-xl p-4">
                <h4 className="text-sm font-medium text-[rgb(var(--color-text))] mb-3 flex items-center gap-1.5">
                  <Activity size={14} className="text-astra-400" />
                  Performance Metrics
                </h4>
                <div className="space-y-4">
                  {activeStepData.stats.map((stat, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-[rgb(var(--color-text-secondary))]">{stat.label}</span>
                        <span className="font-medium text-astra-400">{stat.value}</span>
                      </div>
                      <div className="h-1.5 bg-[rgb(var(--color-surface))] rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-to-r from-astra-500 to-astra-400 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min((i + 1) * 25, 100)}%` }}
                          transition={{ duration: 1, delay: i * 0.2 }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Technical Architecture */}
      <div className="card p-6 mt-6">
        <h2 className="text-lg font-semibold text-[rgb(var(--color-text))] mb-4">Technical Architecture</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[rgb(var(--color-bg))] rounded-xl p-4">
            <h3 className="text-sm font-medium text-[rgb(var(--color-text))] mb-2 flex items-center gap-1.5">
              <Cpu size={14} className="text-green-500" />
              Backend Stack
            </h3>
            <ul className="space-y-1 text-xs text-[rgb(var(--color-text-secondary))]">
              <li>• Python 3.13 + FastAPI + Uvicorn (ASGI)</li>
              <li>• SQLite (WAL mode) + SQLAlchemy ORM</li>
              <li>• ChromaDB vector store (384-dim embeddings)</li>
              <li>• Ollama local models (Qwen, Llama, Mistral)</li>
              <li>• OpenAI & Anthropic cloud fallback</li>
              <li>• Whisper STT + Piper TTS</li>
              <li>• Playwright + PyAutoGUI automation</li>
            </ul>
          </div>
          <div className="bg-[rgb(var(--color-bg))] rounded-xl p-4">
            <h3 className="text-sm font-medium text-[rgb(var(--color-text))] mb-2 flex items-center gap-1.5">
              <Monitor size={14} className="text-blue-500" />
              Frontend Stack
            </h3>
            <ul className="space-y-1 text-xs text-[rgb(var(--color-text-secondary))]">
              <li>• Electron + React 18 + TypeScript</li>
              <li>• Vite bundler + Tailwind CSS</li>
              <li>• Zustand state management</li>
              <li>• TanStack React Query</li>
              <li>• Framer Motion animations</li>
              <li>• Recharts data visualization</li>
              <li>• WebSocket real-time streaming</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

function Monitor(props: any) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  )
}

