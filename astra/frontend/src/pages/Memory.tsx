import { useState, useEffect, useCallback, useMemo, memo, useRef } from 'react'
import { Brain, Search, Trash2, Clock, Star, Tag } from 'lucide-react'
import { api } from '../services/api'
import { useRouteFocus } from '../hooks/useRouteFocus'
import { showToast } from '../components/Toast'
import EmptyState from '../components/EmptyState'
import OfflineState from '../components/OfflineState'
import { SkeletonList } from '../components/SkeletonLoader'
import { useAppStore } from '../stores/appStore'
import type { Memory as MemoryType } from '../types'

function getTypeIcon(type: string) {
  switch (type) {
    case 'short_term': return <Clock size={14} className="text-yellow-500" />
    case 'long_term': return <Star size={14} className="text-purple-500" />
    case 'knowledge': return <Brain size={14} className="text-blue-500" />
    default: return <Brain size={14} />
  }
}

const MemoryCard = memo(function MemoryCard({
  mem,
  isFocused,
  onDelete,
  onFocusMove,
  tabIndex,
}: {
  mem: MemoryType
  isFocused: boolean
  onDelete: (id: string) => void
  onFocusMove: (dir: 'next' | 'prev' | 'first' | 'last') => void
  tabIndex: number
}) {
  const cardRef = useRef<HTMLDivElement>(null)

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      onFocusMove('next')
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      onFocusMove('prev')
    } else if (e.key === 'Home') {
      e.preventDefault()
      onFocusMove('first')
    } else if (e.key === 'End') {
      e.preventDefault()
      onFocusMove('last')
    } else if (e.key === 'Enter' || e.key === ' ') {
      // The card itself isn't a trigger; let the delete button handle its own action.
      return
    }
  }

  return (
    <div
      ref={cardRef}
      tabIndex={tabIndex}
      role="listitem"
      aria-label={`Memory: ${mem.content.slice(0, 60)}`}
      onKeyDown={handleKeyDown}
      className={`card p-4 hover:shadow-md transition-all focus:outline-none ${
        isFocused ? 'ring-2 ring-astra-500' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            {getTypeIcon(mem.memory_type)}
            <span className="text-xs font-medium uppercase text-[rgb(var(--color-text-secondary))]">
              {mem.memory_type.replace('_', ' ')}
            </span>
            {mem.category && (
              <span className="flex items-center gap-1 text-xs text-astra-400">
                <Tag size={10} />
                {mem.category}
              </span>
            )}
            {mem.importance > 0.7 && (
              <span className="text-xs text-yellow-500 font-medium">Important</span>
            )}
          </div>
          <p className="text-sm text-[rgb(var(--color-text))] mb-1">{mem.content}</p>
          {mem.summary && (
            <p className="text-xs text-[rgb(var(--color-text-secondary))]">{mem.summary}</p>
          )}
          {mem.tags && mem.tags.length > 0 && (
            <div className="flex gap-1 mt-2">
              {mem.tags.map((tag, i) => (
                <span key={i} className="px-2 py-0.5 text-xs rounded-full bg-astra-500/10 text-astra-400">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 ml-4">
          <span className="text-xs text-[rgb(var(--color-text-secondary))]">
            {Math.round((mem.importance || 0) * 100)}%
          </span>
          <button
            onClick={() => onDelete(mem.id)}
            className="btn-ghost p-1.5 text-red-500 hover:text-red-400"
            aria-label={`Delete ${mem.memory_type} memory: ${mem.content.slice(0, 40)}`}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  )
})

export default function Memory() {
  const { ref: headingRef } = useRouteFocus()
  const [memories, setMemories] = useState<MemoryType[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(0)
  const isConnected = useAppStore((s) => s.isConnected)

  const loadMemories = useCallback(async (query?: string) => {
    setLoading(true)
    try {
      const data = await api.memory.search(query || 'all memories', undefined, 50)
      setMemories(data.results)
      setFocusedIndex(0)
    } catch (err) {
      console.error('Failed to load memories:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadMemories()
  }, [loadMemories])

  const handleSearch = useCallback(() => {
    loadMemories(search || undefined)
  }, [loadMemories, search])

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await api.memory.delete(id)
        setMemories((prev) => prev.filter((m) => m.id !== id))
        setFocusedIndex((prev) => Math.max(0, Math.min(prev, memories.length - 2)))
        showToast({ type: 'success', title: 'Memory deleted' })
      } catch (err) {
        showToast({ type: 'error', title: 'Failed to delete memory', message: (err as Error).message })
      }
    },
    [memories.length]
  )

  const moveFocus = useCallback((dir: 'next' | 'prev' | 'first' | 'last') => {
    setFocusedIndex((prev) => {
      const max = memories.length - 1
      if (dir === 'next') return Math.min(prev + 1, max)
      if (dir === 'prev') return Math.max(prev - 1, 0)
      if (dir === 'first') return 0
      return max
    })
  }, [memories.length])

  // Focus the newly focused card on arrow navigation
  const listRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const items = listRef.current?.querySelectorAll<HTMLDivElement>('[role="listitem"]')
    items?.[focusedIndex]?.focus()
  }, [focusedIndex])

  const memoryCount = useMemo(() => memories.length, [memories])

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-bold text-[rgb(var(--color-text))] focus:outline-none">Memory</h1>
          <p className="text-sm text-[rgb(var(--color-text-secondary))] mt-1">
            {memoryCount} memories stored
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="flex gap-2 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[rgb(var(--color-text-secondary))]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search memories..."
            className="input pl-10"
            aria-label="Search memories"
          />
        </div>
        <button onClick={handleSearch} className="btn-primary">
          Search
        </button>
      </div>

{/* Memory List */}
      <div ref={listRef} className="space-y-3" role="list" aria-label="Memory items">
        {!isConnected && !loading ? (
          <OfflineState
            title="Backend Disconnected"
            description="Connect to the Astra backend to browse and search memories."
            onRetry={() => { loadMemories() }}
          />
        ) : loading ? (
          <SkeletonList items={5} />
        ) : memories.length === 0 ? (
          <EmptyState
            icon={<Brain size={48} />}
            title="No memories found"
            description="Memories are created automatically during conversations"
          />
        ) : (
          memories.map((mem, i) => (
            <MemoryCard
              key={mem.id}
              mem={mem}
              isFocused={i === focusedIndex}
              onDelete={handleDelete}
              onFocusMove={moveFocus}
              tabIndex={i === focusedIndex ? 0 : -1}
            />
          ))
        )}
      </div>
    </div>
  )
}

