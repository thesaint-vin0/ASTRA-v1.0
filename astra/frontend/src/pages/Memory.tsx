import { useState, useEffect } from 'react'
import { Brain, Search, Trash2, Clock, Star, Tag } from 'lucide-react'
import { api } from '../services/api'
import type { Memory as MemoryType } from '../types'

export default function Memory() {
  const [memories, setMemories] = useState<MemoryType[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadMemories()
  }, [])

  const loadMemories = async (query?: string) => {
    setLoading(true)
    try {
      const data = await api.memory.search(query || 'all memories', undefined, 50)
      setMemories(data.results)
    } catch (err) {
      console.error('Failed to load memories:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    loadMemories(search || undefined)
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'short_term': return <Clock size={14} className="text-yellow-500" />
      case 'long_term': return <Star size={14} className="text-purple-500" />
      case 'knowledge': return <Brain size={14} className="text-blue-500" />
      default: return <Brain size={14} />
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[rgb(var(--color-text))]">Memory</h1>
          <p className="text-sm text-[rgb(var(--color-text-secondary))] mt-1">
            {memories.length} memories stored
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
          />
        </div>
        <button onClick={handleSearch} className="btn-primary">
          Search
        </button>
      </div>

      {/* Memory List */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-astra-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-[rgb(var(--color-text-secondary))]">Searching memories...</p>
          </div>
        ) : memories.length === 0 ? (
          <div className="text-center py-12">
            <Brain size={48} className="text-[rgb(var(--color-text-secondary))] mx-auto mb-3 opacity-50" />
            <p className="text-[rgb(var(--color-text-secondary))]">No memories found</p>
            <p className="text-sm text-[rgb(var(--color-text-secondary))] mt-1">
              Memories are created automatically during conversations
            </p>
          </div>
        ) : (
          memories.map((mem) => (
            <div key={mem.id} className="card p-4 hover:shadow-md transition-all">
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
                  <button className="btn-ghost p-1.5 text-red-500 hover:text-red-400">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

