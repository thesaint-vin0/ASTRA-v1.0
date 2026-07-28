import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Brain, MessageSquare, Cpu, Network, GitBranch,
  Puzzle, Server, User, ArrowDown, Zap, Activity, BarChart3
} from 'lucide-react'

interface PipelineStep {
  id: string
  label: string
  icon: React.ReactNode
  description: string
  responsibilities: string[]
  stats: { label: string; value: string }[]
}

const pipelineSteps: PipelineStep[] = [
  {
    id: 'user',
    label: 'User',
    icon: <User size={20} />,
    description: 'The entry point where users interact with Astra through chat, voice, or vision.',
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
  },
  {
    id: 'conversation',
    label: 'Conversation Engine',
    icon: <MessageSquare size={20} />,
    description: 'Manages conversation flow, context window, message history, and session state.',
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
  },
  {
    id: 'reasoning',
    label: 'Reasoning Engine',
    icon: <Brain size={20} />,
    description: 'Performs chain-of-thought reasoning, multi-step analysis, and logic decomposition.',
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
  },
  {
    id: 'planning',
    label: 'Planning Engine',
    icon: <GitBranch size={20} />,
    description: 'Decomposes complex goals into actionable plans with parallel task execution.',
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
  },
  {
    id: 'memory',
    label: 'Memory Engine',
    icon: <Network size={20} />,
    description: 'Three-layer memory system combining short-term, long-term, and knowledge storage.',
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
  },
  {
    id: 'tools',
    label: 'Tool Manager',
    icon: <Zap size={20} />,
    description: 'Registry and executor for built-in tools, plugins, and custom actions.',
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
  },
  {
    id: 'plugins',
    label: 'Plugin Manager',
    icon: <Puzzle size={20} />,
    description: 'Extend functionality through a sandboxed plugin system with hot-reload support.',
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
  },
  {
    id: 'model',
    label: 'Model Manager',
    icon: <Server size={20} />,
    description: 'Abstracts multiple AI providers (local/cloud) with automatic fallback and failover.',
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
  },
  {
    id: 'response',
    label: 'Response Generator',
    icon: <Activity size={20} />,
    description: 'Formats and streams the final response with citations, tool results, and rich content.',
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
  },
]

export default function HowAstraWorks() {
  const [activeStep, setActiveStep] = useState<string | null>(null)
  const [hoveredStep, setHoveredStep] = useState<string | null>(null)

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
        <h2 className="text-lg font-semibold text-[rgb(var(--color-text))] mb-6 flex items-center gap-2">
          <BarChart3 size={18} className="text-astra-400" />
          Processing Pipeline
        </h2>
        <div className="relative">
          {/* Pipeline Visualization */}
          <div className="hidden lg:flex items-center justify-between gap-1 mb-4">
            {pipelineSteps.map((step, i) => (
              <div key={step.id} className="flex-1 flex flex-col items-center">
                <motion.button
                  onMouseEnter={() => setHoveredStep(step.id)}
                  onMouseLeave={() => setHoveredStep(null)}
                  onClick={() => setActiveStep(activeStep === step.id ? null : step.id)}
                  className={`relative z-10 w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 ${
                    activeStep === step.id
                      ? 'bg-astra-600 text-white shadow-lg shadow-astra-500/30 scale-110'
                      : hoveredStep === step.id
                      ? 'bg-astra-600/20 text-astra-400 scale-105'
                      : 'bg-[rgb(var(--color-surface))] text-[rgb(var(--color-text-secondary))] border border-[rgb(var(--color-border))]'
                  }`}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {step.icon}
                </motion.button>
                <span className={`text-[10px] mt-1.5 text-center font-medium transition-colors ${
                  activeStep === step.id ? 'text-astra-400' : 'text-[rgb(var(--color-text-secondary))]'
                }`}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>

          {/* Connection arrows */}
          <div className="hidden lg:flex justify-between px-6 mb-6">
            {pipelineSteps.slice(0, -1).map((_, i) => (
              <ArrowDown key={i} size={14} className="text-[rgb(var(--color-text-secondary))] opacity-40 -rotate-90 flex-shrink-0" />
            ))}
          </div>

          {/* Mobile list */}
          <div className="lg:hidden space-y-2">
            {pipelineSteps.map((step) => (
              <button
                key={step.id}
                onClick={() => setActiveStep(activeStep === step.id ? null : step.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${
                  activeStep === step.id ? 'bg-astra-600/10 border border-astra-500/20' : 'hover:bg-[rgb(var(--color-bg))]'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  activeStep === step.id ? 'bg-astra-600 text-white' : 'bg-[rgb(var(--color-surface))] text-[rgb(var(--color-text-secondary))]'
                }`}>
                  {step.icon}
                </div>
                <span className="text-sm font-medium text-[rgb(var(--color-text))]">{step.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Detail Panel */}
      {activeStep && (
        <motion.div
          key={activeStep}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="card p-6"
        >
          {(() => {
            const step = pipelineSteps.find((s) => s.id === activeStep)
            if (!step) return null
            return (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Description & Responsibilities */}
                <div className="lg:col-span-2">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-astra-600 flex items-center justify-center text-white">
                      {step.icon}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-[rgb(var(--color-text))]">{step.label}</h3>
                      <p className="text-sm text-[rgb(var(--color-text-secondary))]">{step.description}</p>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-[rgb(var(--color-text))] mb-2">Key Responsibilities</h4>
                    <ul className="space-y-1.5">
                      {step.responsibilities.map((r, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-[rgb(var(--color-text-secondary))]">
                          <div className="w-1.5 h-1.5 rounded-full bg-astra-500" />
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Performance Stats */}
                <div className="bg-[rgb(var(--color-bg))] rounded-xl p-4">
                  <h4 className="text-sm font-medium text-[rgb(var(--color-text))] mb-3 flex items-center gap-1.5">
                    <Activity size={14} className="text-astra-400" />
                    Performance
                  </h4>
                  <div className="space-y-3">
                    {step.stats.map((stat, i) => (
                      <div key={i}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-[rgb(var(--color-text-secondary))]">{stat.label}</span>
                          <span className="font-medium text-astra-400">{stat.value}</span>
                        </div>
                        <div className="h-1 bg-[rgb(var(--color-surface))] rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-gradient-to-r from-astra-500 to-astra-400 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${(i + 1) * 25}%` }}
                            transition={{ duration: 1, delay: i * 0.2 }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          })()}
        </motion.div>
      )}

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

