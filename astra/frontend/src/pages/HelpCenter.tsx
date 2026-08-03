import { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Book, Command, ChevronRight, ExternalLink, Copy,
  Check, ChevronDown, ChevronUp, Star, History, Keyboard
} from 'lucide-react'
import { showToast } from '../components/Toast'
import { useRouteFocus } from '../hooks/useRouteFocus'
import EmptyState from '../components/EmptyState'

interface HelpArticle {
  id: string
  title: string
  description: string
  category: string
  tags: string[]
  content: string
  related: string[]
}

const helpArticles: HelpArticle[] = [
  {
    id: 'getting-started',
    title: 'Getting Started with Astra',
    description: 'Learn the basics of using Astra AI Operating System',
    category: 'Getting Started',
    tags: ['basics', 'introduction', 'setup'],
    content: `## Welcome to Astra AI\n\nAstra is your personal AI operating system that runs entirely on your device. Here's how to get started:\n\n1. **Launch Astra** - Open the application from your desktop\n2. **Complete Onboarding** - The setup wizard will guide you through configuration\n3. **Start Chatting** - Type a message or use voice commands\n4. **Explore Features** - Try memory, plugins, automation, and more\n\n### Quick Start\nRun this command to start the backend:\n\`\`\`bash\npython -m astra.backend.main\n\`\`\`\n\nThen launch the frontend:\n\`\`\`bash\ncd astra/frontend && npm run dev\n\`\`\`\n\nAstra uses local AI models via Ollama, keeping your data private and secure.`,
    related: ['chat-basics', 'voice-setup', 'model-config'],
  },
  {
    id: 'chat-basics',
    title: 'Chat Basics',
    description: 'How to have conversations with Astra',
    category: 'Chat',
    tags: ['chat', 'messages', 'streaming'],
    content: `## Chatting with Astra\n\nAstra supports natural conversation with streaming responses.\n\n### Sending Messages\n- Type your message in the input box and press Enter\n- Use Shift+Enter for multi-line messages\n- Attach files by dragging them into the chat\n\n### Conversation Management\n- Your chat history is automatically saved\n- Use the sidebar to switch between conversations\n- Delete conversations you no longer need\n\n### Streaming Responses\nAstra streams responses token-by-token in real-time, so you see the response as it's generated.\n\n### Keyboard Shortcuts\n\`\`\`\nCtrl+Enter    Send message\nShift+Enter   New line\nCtrl+K        Command palette\nCtrl+N        New conversation\n\`\`\``,
    related: ['getting-started', 'voice-setup', 'vision-usage'],
  },
  {
    id: 'voice-setup',
    title: 'Voice Setup & Commands',
    description: 'Configure voice input and wake words',
    category: 'Voice',
    tags: ['voice', 'speech', 'wake-word', 'microphone'],
    content: `## Voice Features\n\nAstra supports voice input through wake words and push-to-talk.\n\n### Wake Words\n- "Hey Astra" - Default wake word\n- "Okay Astra" - Alternative wake word\n- Wake words can be customized in Settings > Voice\n\n### Voice Commands\nOnce activated, you can:\n- Ask questions naturally\n- Dictate messages\n- Control desktop automation\n\n### Requirements\n- Working microphone\n- Whisper model for speech-to-text\n- Piper voice for text-to-speech\n\n### Test Your Setup\n\`\`\`bash\n# Check microphone\npython -c "import sounddevice; print(sounddevice.query_devices())"\n\`\`\``,
    related: ['getting-started', 'privacy', 'troubleshooting'],
  },
  {
    id: 'model-config',
    title: 'Model Configuration',
    description: 'Manage AI models, providers, and performance',
    category: 'Models',
    tags: ['models', 'ollama', 'AI', 'configuration'],
    content: `## AI Model Management\n\nAstra supports multiple AI models and providers.\n\n### Local Models (Ollama)\n- Pull models directly from the Model Manager\n- Supported: Qwen2.5, Llama 3.2, Mistral, DeepSeek\n- Models run locally on your device\n\n### Cloud Providers\n- OpenAI (GPT-4, GPT-4o-mini)\n- Anthropic (Claude 3, Claude 3.5)\n\n### Performance Tips\n- Larger models (7B+) require more RAM\n- GPU acceleration improves speed\n- Context length affects memory usage\n\n### Pull a Model\n\`\`\`bash\nollama pull qwen2.5:7b\nollama pull llama3.2:3b\n\`\`\``,
    related: ['chat-basics', 'memory-guide', 'troubleshooting'],
  },
  {
    id: 'memory-guide',
    title: 'Memory System Guide',
    description: 'Understanding Astra\'s three-layer memory',
    category: 'Memory',
    tags: ['memory', 'storage', 'privacy', 'knowledge'],
    content: `## Memory System\n\nAstra uses a three-layer memory system for personalized assistance.\n\n### Short-Term Memory\n- Current conversation context\n- Cleared when conversation ends\n- No persistent storage\n\n### Long-Term Memory\n- User preferences and habits\n- Important information you share\n- Stored encrypted locally\n\n### Knowledge Memory\n- Documents you import\n- Vector searchable content\n- Personal knowledge base\n\n### Privacy Controls\nYou can clear, export, or disable any memory layer at any time.\n\n### Search Memories\n\`\`\`python\n# API example\nimport requests\nrequests.post("http://localhost:8642/api/memory/search", \n  json={"query": "your search term", "limit": 20})\n\`\`\``,
    related: ['getting-started', 'privacy', 'file-management'],
  },
  {
    id: 'privacy',
    title: 'Privacy & Security',
    description: 'How Astra protects your data',
    category: 'Security',
    tags: ['privacy', 'security', 'encryption', 'data'],
    content: `## Privacy-First Design\n\nAstra is designed with privacy as a core principle.\n\n### Local Processing\n- All AI processing happens on your device\n- No data sent to external servers\n- Optional cloud fallback with explicit permission\n\n### Data Storage\n- All data stored locally on your device\n- Memory encrypted at rest\n- You control what is remembered\n\n### Permissions\n- Each capability requires explicit approval\n- Revoke permissions anytime\n- Audit log of all actions`,
    related: ['memory-guide', 'settings-guide', 'getting-started'],
  },
  {
    id: 'file-management',
    title: 'File Management',
    description: 'Working with files, documents, and drag-and-drop',
    category: 'Files',
    tags: ['files', 'documents', 'drag-drop', 'import'],
    content: `## File Support\n\nAstra supports multiple file formats for analysis and processing.\n\n### Supported Formats\n- Documents: PDF, DOCX, TXT, Markdown\n- Spreadsheets: XLSX, CSV\n- Presentations: PPTX\n- Images: PNG, JPG, GIF, SVG\n- Archives: ZIP\n- Code: All major programming languages\n\n### Drag and Drop\nSimply drag files into the chat window to analyze them.`,
    related: ['memory-guide', 'chat-basics', 'vision-usage'],
  },
  {
    id: 'vision-usage',
    title: 'Vision & Image Analysis',
    description: 'Using vision capabilities for image understanding',
    category: 'Vision',
    tags: ['vision', 'images', 'ocr', 'screenshots'],
    content: `## Vision Capabilities\n\nAstra can analyze images, screenshots, and documents.\n\n### Features\n- Image description and analysis\n- OCR text extraction\n- Screenshot reading\n- Chart and diagram understanding\n- UI element identification\n\n### Usage\nUpload images directly in chat or use screenshots for real-time assistance.`,
    related: ['file-management', 'chat-basics', 'automation-guide'],
  },
  {
    id: 'automation-guide',
    title: 'Desktop Automation',
    description: 'Automate tasks and create workflows',
    category: 'Automation',
    tags: ['automation', 'workflows', 'tasks'],
    content: `## Desktop Automation\n\nAstra can automate repetitive tasks on your desktop.\n\n### Capabilities\n- Open and close applications\n- Launch websites\n- Type text and click buttons\n- Record workflows\n- Schedule recurring tasks\n\n### Safety\n- All automation requires explicit permission\n- You can pause or stop automation anytime\n- Audit log tracks all actions`,
    related: ['privacy', 'chat-basics', 'plugin-development'],
  },
  {
    id: 'plugin-development',
    title: 'Plugin Development',
    description: 'Create custom plugins for Astra',
    category: 'Plugins',
    tags: ['plugins', 'development', 'SDK', 'extend'],
    content: `## Plugin System\n\nExtend Astra with custom plugins.\n\n### Plugin Types\n- Tools: Add new capabilities\n- Commands: Custom slash commands\n- APIs: Connect external services\n- UI: Custom interface components\n\n### Development\nPlugins run in a sandboxed environment for security.`,
    related: ['automation-guide', 'settings-guide', 'developer-mode'],
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting Common Issues',
    description: 'Solutions for common problems',
    category: 'Troubleshooting',
    tags: ['errors', 'help', 'debug', 'issues'],
    content: `## Common Issues & Solutions\n\n### Backend Not Connecting\n1. Ensure Python is installed\n2. Run the backend server\n3. Check port 8642 is available\n\n### Models Not Loading\n1. Verify Ollama is running\n2. Check model names\n3. Ensure sufficient RAM\n\n### Voice Not Working\n1. Check microphone permissions\n2. Verify Whisper is installed\n3. Test audio input\n\n### Check Backend Status\n\`\`\`bash\ncurl http://localhost:8642/api/health\n\`\`\``,
    related: ['getting-started', 'model-config', 'voice-setup'],
  },
  {
    id: 'settings-guide',
    title: 'Settings Guide',
    description: 'Complete reference for all settings',
    category: 'Settings',
    tags: ['settings', 'configuration', 'preferences'],
    content: `## Settings Reference\n\nEvery setting in Astra is explained with defaults and recommendations.\n\n### Categories\n- **Appearance**: Theme, colors, fonts, animations\n- **AI**: Personality, temperature, model selection\n- **Voice**: Wake word, speech speed, volume\n- **Memory**: Retention, privacy, auto-summarization\n- **Accessibility**: Large fonts, high contrast, keyboard nav\n- **Updates**: Channel, auto-update preferences`,
    related: ['privacy', 'model-config', 'memory-guide'],
  },
  {
    id: 'keyboard-shortcuts',
    title: 'Keyboard Shortcuts Reference',
    description: 'Complete list of keyboard shortcuts for Astra',
    category: 'Reference',
    tags: ['shortcuts', 'keyboard', 'navigation', 'productivity'],
    content: `## Keyboard Shortcuts\n\n### Navigation\n\`\`\`\nCtrl+K        Command palette\nCtrl+N        New conversation\nCtrl+D        Go to Dashboard\nCtrl+1-6      Switch sidebar views\n\`\`\`\n\n### Chat\n\`\`\`\nEnter         Send message\nShift+Enter   New line\nCtrl+Enter    Send (alternative)\nEscape        Cancel generation\n\`\`\`\n\n### General\n\`\`\`\nCtrl+,        Open Settings\nCtrl+B        Toggle sidebar\nCtrl+Shift+P  Command palette\nCtrl+L        Focus chat input\n\`\`\``,
    related: ['chat-basics', 'getting-started', 'settings-guide'],
  },
]

const categories = Array.from(new Set(helpArticles.map((a) => a.category)))

// Recently viewed store
const RECENTLY_VIEWED_KEY = 'astra-help-recently-viewed'
const FAVORITES_KEY = 'astra-help-favorites'
const SEARCH_HISTORY_KEY = 'astra-help-search-history'
const MAX_RECENT = 10
const MAX_SEARCH_HISTORY = 10

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key)
    return stored ? JSON.parse(stored) : fallback
  } catch {
    return fallback
  }
}

function saveToStorage(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage full or unavailable
  }
}

export default function HelpCenter() {
  const { ref: headingRef } = useRouteFocus()
  const [search, setSearch] = useState('')
  const [selectedArticle, setSelectedArticle] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [recentlyViewed, setRecentlyViewed] = useState<string[]>(() => loadFromStorage<string[]>(RECENTLY_VIEWED_KEY, []))
  const [favorites, setFavorites] = useState<string[]>(() => loadFromStorage<string[]>(FAVORITES_KEY, []))
  const [searchHistory, setSearchHistory] = useState<string[]>(() => loadFromStorage<string[]>(SEARCH_HISTORY_KEY, []))
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [expandedCodeBlocks, setExpandedCodeBlocks] = useState<string[]>([])
  const [showShortcuts, setShowShortcuts] = useState(false)

  const filteredArticles = useMemo(() => {
    let articles = helpArticles

    if (selectedCategory) {
      articles = articles.filter((a) => a.category === selectedCategory)
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      articles = articles.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q) ||
          a.tags.some((t) => t.includes(q)) ||
          a.content.toLowerCase().includes(q)
      )
    }

    return articles
  }, [search, selectedCategory])

  const searchSuggestions = useMemo(() => {
    if (!search.trim() || search.trim().length < 2) return []
    const q = search.toLowerCase()
    return helpArticles
      .filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.tags.some((t) => t.includes(q))
      )
      .slice(0, 5)
  }, [search])

  const activeArticle = selectedArticle
    ? helpArticles.find((a) => a.id === selectedArticle)
    : null

  const handleSelectArticle = useCallback((id: string) => {
    setSelectedArticle(id)
    setRecentlyViewed((prev) => {
      const updated = [id, ...prev.filter((x) => x !== id)].slice(0, MAX_RECENT)
      saveToStorage(RECENTLY_VIEWED_KEY, updated)
      return updated
    })
  }, [])

  const toggleFavorite = useCallback((id: string) => {
    setFavorites((prev) => {
      const updated = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      saveToStorage(FAVORITES_KEY, updated)
      return updated
    })
  }, [])

  const handleSearch = useCallback((value: string) => {
    setSearch(value)
    if (value.trim()) {
      setSearchHistory((prev) => {
        const updated = [value, ...prev.filter((x) => x !== value)].slice(0, MAX_SEARCH_HISTORY)
        saveToStorage(SEARCH_HISTORY_KEY, updated)
        return updated
      })
    }
  }, [])

  const handleCopy = useCallback(async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(id)
      showToast({ type: 'success', title: 'Copied to clipboard' })
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      showToast({ type: 'error', title: 'Failed to copy' })
    }
  }, [])

  const toggleCodeBlock = useCallback((id: string) => {
    setExpandedCodeBlocks((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }, [])

  // Keyboard shortcuts modal
  const keyboardShortcuts = [
    { keys: 'Ctrl+K', description: 'Open command palette' },
    { keys: 'Ctrl+N', description: 'New conversation' },
    { keys: 'Ctrl+Shift+P', description: 'Command palette' },
    { keys: 'Ctrl+B', description: 'Toggle sidebar' },
    { keys: 'Ctrl+,', description: 'Open settings' },
    { keys: 'Ctrl+D', description: 'Dashboard' },
    { keys: 'Enter', description: 'Send message' },
    { keys: 'Shift+Enter', description: 'New line in chat' },
    { keys: 'Escape', description: 'Cancel / Close' },
    { keys: '↑↓', description: 'Navigate results' },
  ]

  // Process content to make code blocks expandable
  const renderContent = useCallback((content: string, articleId: string) => {
    const lines = content.split('\n')
    const elements: React.ReactNode[] = []
    let inCodeBlock = false
    let codeBlockLines: string[] = []
    let codeBlockLang = ''
    let codeBlockIndex = 0

    lines.forEach((line, i) => {
      if (line.startsWith('```')) {
        if (inCodeBlock) {
          // End of code block
          const blockId = `${articleId}-code-${codeBlockIndex}`
          const isExpanded = expandedCodeBlocks.includes(blockId)
          const code = codeBlockLines.join('\n')

          elements.push(
            <div key={blockId} className="my-3 rounded-lg overflow-hidden border border-[rgb(var(--color-border))]">
              <div className="flex items-center justify-between px-3 py-1.5 bg-[rgb(var(--color-bg))] border-b border-[rgb(var(--color-border))]">
                <span className="text-xs text-[rgb(var(--color-text-secondary))]">{codeBlockLang || 'code'}</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleCopy(code, blockId)}
                    className="btn-ghost p-1"
                    title="Copy code"
                  >
                    {copiedId === blockId ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                  </button>
                  <button
                    onClick={() => toggleCodeBlock(blockId)}
                    className="btn-ghost p-1"
                    title={isExpanded ? 'Collapse' : 'Expand'}
                  >
                    {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                </div>
              </div>
              <div className={`overflow-hidden transition-all ${isExpanded ? '' : 'max-h-32'}`}>
                <pre className="text-xs text-[rgb(var(--color-text))] p-3 overflow-x-auto font-mono bg-[rgb(var(--color-bg))/50]">
                  <code>{code}</code>
                </pre>
              </div>
              {!isExpanded && codeBlockLines.length > 3 && (
                <button
                  onClick={() => toggleCodeBlock(blockId)}
                  className="w-full text-xs text-astra-400 py-1 hover:bg-[rgb(var(--color-bg))] transition-colors"
                >
                  Show more ({codeBlockLines.length - 3} lines hidden)
                </button>
              )}
            </div>
          )

          codeBlockLines = []
          codeBlockLang = ''
          codeBlockIndex++
          inCodeBlock = false
        } else {
          // Start of code block
          inCodeBlock = true
          codeBlockLang = line.replace('```', '').trim()
          codeBlockLines = []
        }
        return
      }

      if (inCodeBlock) {
        codeBlockLines.push(line)
        return
      }

      if (line.startsWith('## ')) {
        elements.push(
          <h3 key={i} className="text-base font-semibold mt-4 mb-2 text-[rgb(var(--color-text))]">
            {line.replace('## ', '')}
          </h3>
        )
      } else if (line.startsWith('- ')) {
        elements.push(
          <li key={i} className="text-sm text-[rgb(var(--color-text-secondary))] ml-4">
            {line.replace('- ', '')}
          </li>
        )
      } else if (line.startsWith('### ')) {
        elements.push(
          <h4 key={i} className="text-sm font-medium mt-3 mb-1 text-[rgb(var(--color-text))]">
            {line.replace('### ', '')}
          </h4>
        )
      } else if (line.match(/^\d+\./)) {
        elements.push(
          <li key={i} className="text-sm text-[rgb(var(--color-text-secondary))] ml-4 list-decimal">
            {line.replace(/^\d+\.\s*/, '')}
          </li>
        )
      } else if (line.trim() === '') {
        elements.push(<div key={i} className="h-2" />)
      } else {
        elements.push(
          <p key={i} className="text-sm text-[rgb(var(--color-text-secondary))]">
            {line}
          </p>
        )
      }
    })

    return elements
  }, [copiedId, expandedCodeBlocks, handleCopy, toggleCodeBlock])

  const recentlyViewedArticles = recentlyViewed
    .map((id) => helpArticles.find((a) => a.id === id))
    .filter(Boolean) as HelpArticle[]

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-bold text-[rgb(var(--color-text))] focus:outline-none">Help Center</h1>
        <p className="text-sm text-[rgb(var(--color-text-secondary))] mt-1">
          Search documentation, tutorials, and troubleshooting guides
        </p>
      </div>

      {/* Search with suggestions */}
      <div className="relative mb-6">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[rgb(var(--color-text-secondary))]" />
        <input
          type="text"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          placeholder="Search help articles, keywords, error codes..."
          className="input pl-10 pr-20"
          autoFocus
          role="combobox"
          aria-expanded={showSuggestions}
          aria-controls="search-suggestions"
          aria-label="Search help articles"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {search && (
            <button
              onClick={() => setSearch('')}
              className="text-[10px] text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-text))]"
              aria-label="Clear search"
            >
              Clear
            </button>
          )}
          <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-[rgb(var(--color-bg))] text-[rgb(var(--color-text-secondary))]">
            <Command size={10} className="inline" />K
          </kbd>
        </div>

        {/* Search suggestions */}
        <AnimatePresence>
          {showSuggestions && searchSuggestions.length > 0 && (
            <motion.div
              id="search-suggestions"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="absolute top-full left-0 right-0 mt-1 bg-[rgb(var(--color-surface))] border border-[rgb(var(--color-border))] rounded-lg shadow-xl z-20 overflow-hidden"
            >
              <div className="p-1">
                <p className="text-[10px] text-[rgb(var(--color-text-secondary))] px-2 py-1 uppercase tracking-wider font-semibold">
                  Suggestions
                </p>
                {searchSuggestions.map((article) => (
                  <button
                    key={article.id}
                    onClick={() => {
                      handleSelectArticle(article.id)
                      setShowSuggestions(false)
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-left hover:bg-[rgb(var(--color-bg))] transition-colors"
                  >
                    <Search size={12} className="text-[rgb(var(--color-text-secondary))] flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-[rgb(var(--color-text))] truncate">{article.title}</p>
                      <p className="text-xs text-[rgb(var(--color-text-secondary))] truncate">{article.category}</p>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Category Filters & Shortcuts Toggle */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <div className="flex flex-wrap gap-2 flex-1">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              !selectedCategory
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
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                selectedCategory === cat
                  ? 'bg-astra-600 text-white'
                  : 'bg-[rgb(var(--color-surface))] text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-text))]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowShortcuts(!showShortcuts)}
          className={`btn-ghost text-xs flex items-center gap-1 px-3 py-1.5 ${showShortcuts ? 'text-astra-400' : ''}`}
          title="Keyboard shortcuts"
        >
          <Keyboard size={14} />
          Shortcuts
        </button>
      </div>

      {/* Keyboard Shortcuts Reference */}
      <AnimatePresence>
        {showShortcuts && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-6"
          >
            <div className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-[rgb(var(--color-text))] flex items-center gap-2">
                  <Keyboard size={14} className="text-astra-400" />
                  Keyboard Shortcuts
                </h3>
                <button onClick={() => setShowShortcuts(false)} className="btn-ghost text-xs">Close</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {keyboardShortcuts.map((shortcut) => (
                  <div key={shortcut.keys} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-[rgb(var(--color-bg))]">
                    <span className="text-sm text-[rgb(var(--color-text-secondary))]">{shortcut.description}</span>
                    <kbd className="text-xs px-2 py-0.5 rounded bg-[rgb(var(--color-surface))] border border-[rgb(var(--color-border))] font-mono text-[rgb(var(--color-text))]">
                      {shortcut.keys}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          {/* Recently Viewed */}
          {recentlyViewedArticles.length > 0 && (
            <div className="card p-3">
              <h3 className="text-xs font-semibold text-[rgb(var(--color-text-secondary))] uppercase tracking-wider mb-2 flex items-center gap-1">
                <History size={12} />
                Recently Viewed
              </h3>
              <div className="space-y-1">
                {recentlyViewedArticles.slice(0, 4).map((article) => (
                  <button
                    key={article.id}
                    onClick={() => handleSelectArticle(article.id)}
                    className="w-full text-left text-xs text-[rgb(var(--color-text))] hover:text-astra-400 truncate py-1 px-1 rounded hover:bg-[rgb(var(--color-bg))]"
                  >
                    {article.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Search History */}
          {searchHistory.length > 0 && (
            <div className="card p-3">
              <h3 className="text-xs font-semibold text-[rgb(var(--color-text-secondary))] uppercase tracking-wider mb-2 flex items-center gap-1">
                <History size={12} />
                Search History
              </h3>
              <div className="space-y-1">
                {searchHistory.slice(0, 5).map((term) => (
                  <button
                    key={term}
                    onClick={() => handleSearch(term)}
                    className="w-full text-left text-xs text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-text))] truncate py-1 px-1 rounded hover:bg-[rgb(var(--color-bg))]"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          )}

{/* Article List */}
          <div className="space-y-2">
            {filteredArticles.length === 0 ? (
              <EmptyState
                icon={<Book size={32} />}
                title="No articles found"
                description="Try adjusting your search or category filter"
                compact
              />
            ) : (
              filteredArticles.map((article) => {
                const isFavorite = favorites.includes(article.id)
                return (
                  <button
                    key={article.id}
                    onClick={() => handleSelectArticle(article.id)}
                    className={`w-full text-left p-3 rounded-lg transition-all group ${
                      selectedArticle === article.id
                        ? 'bg-astra-600/10 border border-astra-500/20'
                        : 'hover:bg-[rgb(var(--color-surface))] border border-transparent'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-[rgb(var(--color-text))] truncate">{article.title}</p>
                        <p className="text-xs text-[rgb(var(--color-text-secondary))] mt-0.5 line-clamp-2">
                          {article.description}
                        </p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleFavorite(article.id) }}
                        className={`flex-shrink-0 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity ${
                          isFavorite ? 'text-yellow-500 opacity-100' : 'text-[rgb(var(--color-text-secondary))]'
                        }`}
                        title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                      >
                        <Star size={12} fill={isFavorite ? 'currentColor' : 'none'} />
                      </button>
                    </div>
                    <div className="flex gap-1 mt-1.5">
                      {article.tags.slice(0, 2).map((tag) => (
                        <span key={tag} className="px-1.5 py-0.5 text-[10px] rounded bg-[rgb(var(--color-bg))] text-[rgb(var(--color-text-secondary))]">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* Article Content */}
        <div className="lg:col-span-3">
          <AnimatePresence mode="wait">
            {activeArticle ? (
              <motion.div
                key={activeArticle.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="card p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-semibold text-[rgb(var(--color-text))] mb-1">
                      {activeArticle.title}
                    </h2>
                    <p className="text-sm text-[rgb(var(--color-text-secondary))]">
                      {activeArticle.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleFavorite(activeArticle.id)}
                      className={`btn-ghost p-2 ${favorites.includes(activeArticle.id) ? 'text-yellow-500' : ''}`}
                      title={favorites.includes(activeArticle.id) ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      <Star size={16} fill={favorites.includes(activeArticle.id) ? 'currentColor' : 'none'} />
                    </button>
                    <button
                      onClick={() => handleCopy(window.location.href, 'share')}
                      className="btn-ghost p-2"
                      title="Copy link"
                    >
                      <ExternalLink size={16} />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-astra-500/10 text-astra-400">
                    {activeArticle.category}
                  </span>
                  {activeArticle.tags.map((tag) => (
                    <span key={tag} className="text-xs text-[rgb(var(--color-text-secondary))]">
                      #{tag}
                    </span>
                  ))}
                </div>

                <div className="prose prose-sm max-w-none text-[rgb(var(--color-text))]">
                  {renderContent(activeArticle.content, activeArticle.id)}
                </div>

                {/* Copy Command Button */}
                <div className="mt-6 p-3 rounded-lg bg-[rgb(var(--color-bg))] border border-[rgb(var(--color-border))]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Command size={14} className="text-astra-400" />
                      <span className="text-sm text-[rgb(var(--color-text-secondary))]">Quick command:</span>
                      <code className="text-xs font-mono text-astra-400">Ctrl+K → search "{activeArticle.title}"</code>
                    </div>
                    <button
                      onClick={() => {
                        handleCopy(`Ctrl+K then search "${activeArticle.title}"`, 'cmd-copy')
                        showToast({ type: 'success', title: 'Command copied' })
                      }}
                      className="btn-ghost p-1.5"
                    >
                      {copiedId === 'cmd-copy' ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>

                {/* Related Articles */}
                {activeArticle.related.length > 0 && (
                  <div className="mt-6 pt-4 border-t border-[rgb(var(--color-border))]">
                    <h4 className="text-sm font-medium text-[rgb(var(--color-text))] mb-2">Related Articles</h4>
                    <div className="flex flex-wrap gap-2">
                      {activeArticle.related.map((id) => {
                        const related = helpArticles.find((a) => a.id === id)
                        if (!related) return null
                        return (
                          <button
                            key={id}
                            onClick={() => handleSelectArticle(id)}
                            className="flex items-center gap-1 text-xs text-astra-400 hover:text-astra-300"
                          >
                            <ChevronRight size={10} />
                            {related.title}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="card p-8 text-center"
              >
                <Book size={48} className="text-[rgb(var(--color-text-secondary))] mx-auto mb-3 opacity-50" />
                <h3 className="text-lg font-semibold text-[rgb(var(--color-text))] mb-1">
                  Select an Article
                </h3>
                <p className="text-sm text-[rgb(var(--color-text-secondary))]">
                  Choose a topic from the list or search for specific help
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

