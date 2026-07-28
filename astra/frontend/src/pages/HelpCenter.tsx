import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Book, Command, AlertTriangle, Puzzle, Cpu, MessageSquare, Brain, Mic, Eye, Zap, FileText, HelpCircle, ChevronRight, ExternalLink } from 'lucide-react'

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
    content: `## Welcome to Astra AI\n\nAstra is your personal AI operating system that runs entirely on your device. Here's how to get started:\n\n1. **Launch Astra** - Open the application from your desktop\n2. **Complete Onboarding** - The setup wizard will guide you through configuration\n3. **Start Chatting** - Type a message or use voice commands\n4. **Explore Features** - Try memory, plugins, automation, and more\n\nAstra uses local AI models via Ollama, keeping your data private and secure.`,
    related: ['chat-basics', 'voice-setup', 'model-config'],
  },
  {
    id: 'chat-basics',
    title: 'Chat Basics',
    description: 'How to have conversations with Astra',
    category: 'Chat',
    tags: ['chat', 'messages', 'streaming'],
    content: `## Chatting with Astra\n\nAstra supports natural conversation with streaming responses.\n\n### Sending Messages\n- Type your message in the input box and press Enter\n- Use Shift+Enter for multi-line messages\n- Attach files by dragging them into the chat\n\n### Conversation Management\n- Your chat history is automatically saved\n- Use the sidebar to switch between conversations\n- Delete conversations you no longer need\n\n### Streaming Responses\nAstra streams responses token-by-token in real-time, so you see the response as it's generated.`,
    related: ['getting-started', 'voice-setup', 'vision-usage'],
  },
  {
    id: 'voice-setup',
    title: 'Voice Setup & Commands',
    description: 'Configure voice input and wake words',
    category: 'Voice',
    tags: ['voice', 'speech', 'wake-word', 'microphone'],
    content: `## Voice Features\n\nAstra supports voice input through wake words and push-to-talk.\n\n### Wake Words\n- "Hey Astra" - Default wake word\n- "Okay Astra" - Alternative wake word\n- Wake words can be customized in Settings > Voice\n\n### Voice Commands\nOnce activated, you can:\n- Ask questions naturally\n- Dictate messages\n- Control desktop automation\n\n### Requirements\n- Working microphone\n- Whisper model for speech-to-text\n- Piper voice for text-to-speech`,
    related: ['getting-started', 'privacy', 'troubleshooting'],
  },
  {
    id: 'model-config',
    title: 'Model Configuration',
    description: 'Manage AI models, providers, and performance',
    category: 'Models',
    tags: ['models', 'ollama', 'AI', 'configuration'],
    content: `## AI Model Management\n\nAstra supports multiple AI models and providers.\n\n### Local Models (Ollama)\n- Pull models directly from the Model Manager\n- Supported: Qwen2.5, Llama 3.2, Mistral, DeepSeek\n- Models run locally on your device\n\n### Cloud Providers\n- OpenAI (GPT-4, GPT-4o-mini)\n- Anthropic (Claude 3, Claude 3.5)\n\n### Performance Tips\n- Larger models (7B+) require more RAM\n- GPU acceleration improves speed\n- Context length affects memory usage`,
    related: ['chat-basics', 'memory-guide', 'troubleshooting'],
  },
  {
    id: 'memory-guide',
    title: 'Memory System Guide',
    description: 'Understanding Astra\'s three-layer memory',
    category: 'Memory',
    tags: ['memory', 'storage', 'privacy', 'knowledge'],
    content: `## Memory System\n\nAstra uses a three-layer memory system for personalized assistance.\n\n### Short-Term Memory\n- Current conversation context\n- Cleared when conversation ends\n- No persistent storage\n\n### Long-Term Memory\n- User preferences and habits\n- Important information you share\n- Stored encrypted locally\n\n### Knowledge Memory\n- Documents you import\n- Vector searchable content\n- Personal knowledge base\n\n### Privacy Controls\nYou can clear, export, or disable any memory layer at any time.`,
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
    content: `## Common Issues & Solutions\n\n### Backend Not Connecting\n1. Ensure Python is installed\n2. Run the backend server\n3. Check port 8642 is available\n\n### Models Not Loading\n1. Verify Ollama is running\n2. Check model names\n3. Ensure sufficient RAM\n\n### Voice Not Working\n1. Check microphone permissions\n2. Verify Whisper is installed\n3. Test audio input`,
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
]

const categories = Array.from(new Set(helpArticles.map((a) => a.category)))

export default function HelpCenter() {
  const [search, setSearch] = useState('')
  const [selectedArticle, setSelectedArticle] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

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

  const activeArticle = selectedArticle
    ? helpArticles.find((a) => a.id === selectedArticle)
    : null

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[rgb(var(--color-text))]">Help Center</h1>
        <p className="text-sm text-[rgb(var(--color-text-secondary))] mt-1">
          Search documentation, tutorials, and troubleshooting guides
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[rgb(var(--color-text-secondary))]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search help articles, keywords, error codes..."
          className="input pl-10 pr-4"
          autoFocus
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] text-[rgb(var(--color-text-secondary))]">
          <Command size={10} />
          <span>K</span>
        </div>
      </div>

      {/* Category Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Article List */}
        <div className="lg:col-span-1 space-y-2">
          {filteredArticles.length === 0 ? (
            <div className="text-center py-8">
              <Book size={32} className="text-[rgb(var(--color-text-secondary))] mx-auto mb-2 opacity-50" />
              <p className="text-sm text-[rgb(var(--color-text-secondary))]">No articles found</p>
            </div>
          ) : (
            filteredArticles.map((article) => (
              <button
                key={article.id}
                onClick={() => setSelectedArticle(article.id)}
                className={`w-full text-left p-3 rounded-lg transition-all ${
                  selectedArticle === article.id
                    ? 'bg-astra-600/10 border border-astra-500/20'
                    : 'hover:bg-[rgb(var(--color-surface))] border border-transparent'
                }`}
              >
                <p className="text-sm font-medium text-[rgb(var(--color-text))]">{article.title}</p>
                <p className="text-xs text-[rgb(var(--color-text-secondary))] mt-0.5 line-clamp-2">
                  {article.description}
                </p>
                <div className="flex gap-1 mt-1.5">
                  {article.tags.slice(0, 2).map((tag) => (
                    <span key={tag} className="px-1.5 py-0.5 text-[10px] rounded bg-[rgb(var(--color-bg))] text-[rgb(var(--color-text-secondary))]">
                      {tag}
                    </span>
                  ))}
                </div>
              </button>
            ))
          )}
        </div>

        {/* Article Content */}
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {activeArticle ? (
              <motion.div
                key={activeArticle.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="card p-6"
              >
                <h2 className="text-lg font-semibold text-[rgb(var(--color-text))] mb-1">
                  {activeArticle.title}
                </h2>
                <p className="text-sm text-[rgb(var(--color-text-secondary))] mb-4">
                  {activeArticle.description}
                </p>
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
                  {activeArticle.content.split('\n').map((line, i) => {
                    if (line.startsWith('## ')) {
                      return (
                        <h3 key={i} className="text-base font-semibold mt-4 mb-2 text-[rgb(var(--color-text))]">
                          {line.replace('## ', '')}
                        </h3>
                      )
                    }
                    if (line.startsWith('- ')) {
                      return (
                        <li key={i} className="text-sm text-[rgb(var(--color-text-secondary))] ml-4">
                          {line.replace('- ', '')}
                        </li>
                      )
                    }
                    if (line.startsWith('### ')) {
                      return (
                        <h4 key={i} className="text-sm font-medium mt-3 mb-1 text-[rgb(var(--color-text))]">
                          {line.replace('### ', '')}
                        </h4>
                      )
                    }
                    if (line.match(/^\d+\./)) {
                      return (
                        <li key={i} className="text-sm text-[rgb(var(--color-text-secondary))] ml-4 list-decimal">
                          {line.replace(/^\d+\.\s*/, '')}
                        </li>
                      )
                    }
                    if (line.trim() === '') return <div key={i} className="h-2" />
                    return (
                      <p key={i} className="text-sm text-[rgb(var(--color-text-secondary))]">
                        {line}
                      </p>
                    )
                  })}
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
                            onClick={() => setSelectedArticle(id)}
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

