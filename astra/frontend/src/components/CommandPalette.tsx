import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Search, MessageSquare, Settings, Cpu, Brain, FolderOpen, Puzzle, BookOpen, HelpCircle, Command } from 'lucide-react'

interface CommandItem {
  id: string
  label: string
  description: string
  icon: React.ReactNode
  action: () => void
  category: string
  shortcut?: string
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  const commands: CommandItem[] = [
    { id: 'new-chat', label: 'New Conversation', description: 'Start a new chat', icon: <MessageSquare size={16} />, action: () => navigate('/chat'), category: 'Navigation' },
    { id: 'dashboard', label: 'Go to Dashboard', description: 'View system status', icon: <Command size={16} />, action: () => navigate('/dashboard'), category: 'Navigation' },
    { id: 'memory', label: 'Open Memory', description: 'Browse and search memories', icon: <Brain size={16} />, action: () => navigate('/memory'), category: 'Navigation' },
    { id: 'models', label: 'Model Manager', description: 'Manage AI models', icon: <Cpu size={16} />, action: () => navigate('/models'), category: 'Navigation' },
    { id: 'files', label: 'File Explorer', description: 'Browse files', icon: <FolderOpen size={16} />, action: () => navigate('/files'), category: 'Navigation' },
    { id: 'plugins', label: 'Plugin Manager', description: 'Manage plugins', icon: <Puzzle size={16} />, action: () => navigate('/plugins'), category: 'Navigation' },
    { id: 'settings', label: 'Open Settings', description: 'Customize Astra', icon: <Settings size={16} />, action: () => navigate('/settings'), category: 'Navigation' },
    { id: 'how-it-works', label: 'How Astra Works', description: 'Learn about the architecture', icon: <BookOpen size={16} />, action: () => navigate('/how-it-works'), category: 'Navigation' },
    { id: 'tutorials', label: 'Tutorials', description: 'Interactive guides', icon: <HelpCircle size={16} />, action: () => navigate('/tutorials'), category: 'Navigation' },
    { id: 'help', label: 'Help Center', description: 'Search documentation', icon: <HelpCircle size={16} />, action: () => navigate('/help'), category: 'Navigation' },
  ]

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
      if (e.key === 'Escape') {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
      setSearch('')
      setSelectedIndex(0)
    }
  }, [open])

  const filtered = search.trim()
    ? commands.filter(
        (c) =>
          c.label.toLowerCase().includes(search.toLowerCase()) ||
          c.description.toLowerCase().includes(search.toLowerCase()) ||
          c.category.toLowerCase().includes(search.toLowerCase())
      )
    : commands

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => Math.min(prev + 1, filtered.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => Math.max(prev - 1, 0))
      } else if (e.key === 'Enter' && filtered[selectedIndex]) {
        e.preventDefault()
        filtered[selectedIndex].action()
        setOpen(false)
      }
    },
    [filtered, selectedIndex]
  )

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh]"
          onClick={() => setOpen(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

          {/* Palette */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg bg-[rgb(var(--color-surface))] border border-[rgb(var(--color-border))] rounded-xl shadow-2xl overflow-hidden"
          >
            {/* Search */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-[rgb(var(--color-border))]">
              <Search size={16} className="text-[rgb(var(--color-text-secondary))] flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setSelectedIndex(0)
                }}
                onKeyDown={handleKeyDown}
                placeholder="Search commands, settings, pages..."
                className="flex-1 bg-transparent border-none outline-none text-sm text-[rgb(var(--color-text))] placeholder:text-[rgb(var(--color-text-secondary))]"
              />
              <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-[rgb(var(--color-bg))] text-[rgb(var(--color-text-secondary))]">
                ESC
              </kbd>
            </div>

            {/* Results */}
            <div className="max-h-80 overflow-y-auto scrollbar-thin p-2">
              {filtered.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-[rgb(var(--color-text-secondary))]">No results found</p>
                </div>
              ) : (
                filtered.map((item, index) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      item.action()
                      setOpen(false)
                    }}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
                      index === selectedIndex
                        ? 'bg-astra-600/10 text-astra-400'
                        : 'text-[rgb(var(--color-text))] hover:bg-[rgb(var(--color-bg))]'
                    }`}
                  >
                    <span className="flex-shrink-0">{item.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.label}</p>
                      <p className="text-xs text-[rgb(var(--color-text-secondary))] truncate">
                        {item.description}
                      </p>
                    </div>
                    <span className="text-[10px] text-[rgb(var(--color-text-secondary))] flex-shrink-0">
                      {item.category}
                    </span>
                  </button>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 border-t border-[rgb(var(--color-border))] flex items-center gap-4 text-[10px] text-[rgb(var(--color-text-secondary))]">
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 rounded bg-[rgb(var(--color-bg))]">↑↓</kbd> Navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 rounded bg-[rgb(var(--color-bg))]">↵</kbd> Open
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 rounded bg-[rgb(var(--color-bg))]">ESC</kbd> Close
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

