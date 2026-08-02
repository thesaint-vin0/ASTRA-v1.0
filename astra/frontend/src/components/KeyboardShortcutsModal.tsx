import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Command, Search } from 'lucide-react'
import { useFocusTrap } from '../hooks/useFocusTrap'

interface ShortcutEntry {
  combo: { key: string; ctrl?: boolean; meta?: boolean; shift?: boolean; alt?: boolean }
  description: string
  category: string
}

const DEFAULT_SHORTCUTS: ShortcutEntry[] = [
  { combo: { key: 'k', ctrl: true }, description: 'Open command palette', category: 'Global' },
  { combo: { key: '/', ctrl: true }, description: 'Search', category: 'Global' },
  { combo: { key: 'n', ctrl: true }, description: 'New conversation', category: 'Chat' },
  { combo: { key: 'b', ctrl: true }, description: 'Toggle sidebar', category: 'Navigation' },
  { combo: { key: 'd', ctrl: true }, description: 'Go to Dashboard', category: 'Navigation' },
  { combo: { key: '1', ctrl: true }, description: 'Go to Chat', category: 'Navigation' },
  { combo: { key: '2', ctrl: true }, description: 'Go to Memory', category: 'Navigation' },
  { combo: { key: '3', ctrl: true }, description: 'Go to Models', category: 'Navigation' },
  { combo: { key: '4', ctrl: true }, description: 'Go to Files', category: 'Navigation' },
  { combo: { key: '5', ctrl: true }, description: 'Go to Plugins', category: 'Navigation' },
  { combo: { key: '6', ctrl: true }, description: 'Go to Settings', category: 'Navigation' },
  { combo: { key: 'e', ctrl: true }, description: 'Focus chat input', category: 'Chat' },
  { combo: { key: 'p', ctrl: true }, description: 'Toggle always-on-top', category: 'Window' },
  { combo: { key: 'f', ctrl: true, shift: true }, description: 'Toggle fullscreen', category: 'Window' },
  { combo: { key: 'i', ctrl: true, shift: true }, description: 'Toggle dev tools', category: 'Developer' },
  { combo: { key: 'Escape' }, description: 'Close dialog / Cancel', category: 'Global' },
  { combo: { key: 'Enter' }, description: 'Send message (while typing)', category: 'Chat' },
  { combo: { key: 'Enter', shift: true }, description: 'New line in message', category: 'Chat' },
]

function formatKey(combo: ShortcutEntry['combo']): string {
  const parts: string[] = []
  if (combo.ctrl) parts.push('Ctrl')
  if (combo.meta) parts.push('⌘')
  if (combo.alt) parts.push('Alt')
  if (combo.shift) parts.push('Shift')
  parts.push(combo.key.charAt(0).toUpperCase() + combo.key.slice(1))
  return parts.join(' + ')
}

interface KeyboardShortcutsModalProps {
  open: boolean
  onClose: () => void
}

export default function KeyboardShortcutsModal({ open, onClose }: KeyboardShortcutsModalProps) {
  const [search, setSearch] = useState('')
  const { trapRef } = useFocusTrap(open)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  const filtered = search.trim()
    ? DEFAULT_SHORTCUTS.filter(
        (s) =>
          s.description.toLowerCase().includes(search.toLowerCase()) ||
          s.category.toLowerCase().includes(search.toLowerCase()) ||
          formatKey(s.combo).toLowerCase().includes(search.toLowerCase())
      )
    : DEFAULT_SHORTCUTS

  const grouped = filtered.reduce<Record<string, ShortcutEntry[]>>((acc, shortcut) => {
    if (!acc[shortcut.category]) acc[shortcut.category] = []
    acc[shortcut.category].push(shortcut)
    return acc
  }, {})

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[300] flex items-center justify-center"
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <motion.div
            ref={trapRef}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg max-h-[70vh] bg-[rgb(var(--color-surface))] border border-[rgb(var(--color-border))] rounded-xl shadow-2xl overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Keyboard shortcuts"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-[rgb(var(--color-border))]">
              <div className="flex items-center gap-2">
                <Command size={18} className="text-astra-400" />
                <h2 className="text-sm font-semibold text-[rgb(var(--color-text))]">Keyboard Shortcuts</h2>
              </div>
              <button onClick={onClose} className="btn-ghost p-1" aria-label="Close shortcuts">
                <X size={16} />
              </button>
            </div>

            {/* Search */}
            <div className="px-4 py-2 border-b border-[rgb(var(--color-border))]">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[rgb(var(--color-text-secondary))]" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search shortcuts..."
                  className="input pl-9 text-sm"
                  autoFocus
                  aria-label="Search shortcuts"
                />
              </div>
            </div>

            {/* Shortcuts list */}
            <div className="overflow-y-auto scrollbar-thin p-4 max-h-[50vh]">
              {Object.keys(grouped).length === 0 ? (
                <p className="text-sm text-[rgb(var(--color-text-secondary))] text-center py-4">
                  No shortcuts match your search
                </p>
              ) : (
                Object.entries(grouped).map(([category, shortcuts]) => (
                  <div key={category} className="mb-4 last:mb-0">
                    <h3 className="text-[10px] font-semibold uppercase tracking-wider text-[rgb(var(--color-text-secondary))] mb-2">
                      {category}
                    </h3>
                    <div className="space-y-1">
                      {shortcuts.map((shortcut, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-[rgb(var(--color-bg))]"
                        >
                          <span className="text-sm text-[rgb(var(--color-text))]">
                            {shortcut.description}
                          </span>
                          <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-[rgb(var(--color-bg))] text-[rgb(var(--color-text-secondary))] font-mono">
                            {formatKey(shortcut.combo)}
                          </kbd>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 border-t border-[rgb(var(--color-border))] text-[10px] text-[rgb(var(--color-text-secondary))] text-center">
              Press <kbd className="px-1 py-0.5 rounded bg-[rgb(var(--color-bg))]">Ctrl+K</kbd> to open command palette
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export { DEFAULT_SHORTCUTS, formatKey }

