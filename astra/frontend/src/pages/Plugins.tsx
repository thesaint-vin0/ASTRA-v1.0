import { useState, useEffect, useCallback } from 'react'
import { Puzzle, Package, Trash2, RefreshCw, ToggleLeft, ToggleRight } from 'lucide-react'
import { api } from '../services/api'
import { useRouteFocus } from '../hooks/useRouteFocus'
import EmptyState from '../components/EmptyState'
import OfflineState from '../components/OfflineState'
import { SkeletonCard } from '../components/SkeletonLoader'
import { useAppStore } from '../stores/appStore'
import type { Plugin } from '../types'

export default function Plugins() {
  const { ref: headingRef } = useRouteFocus()
  const [plugins, setPlugins] = useState<Plugin[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const isConnected = useAppStore((s) => s.isConnected)

  const loadPlugins = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.plugins.list()
      setPlugins(data.plugins)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadPlugins()
  }, [loadPlugins])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-500'
      case 'disabled': return 'text-yellow-500'
      case 'error': return 'text-red-500'
      default: return 'text-gray-500'
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-bold text-[rgb(var(--color-text))] focus:outline-none">Plugin Manager</h1>
          <p className="text-sm text-[rgb(var(--color-text-secondary))] mt-1">
            {plugins.length} plugin{plugins.length !== 1 ? 's' : ''} installed
          </p>
        </div>
        <button onClick={loadPlugins} className="btn-secondary flex items-center gap-2" disabled={loading}>
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="p-4 mb-6 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-500">
          {error}
        </div>
      )}

{!isConnected && !loading ? (
        <OfflineState
          title="Backend Disconnected"
          description="Connect to the Astra backend to manage plugins."
          onRetry={() => loadPlugins()}
        />
      ) : loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4" aria-hidden="true">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : plugins.length === 0 ? (
        <EmptyState
          icon={<Puzzle size={48} />}
          title="No plugins installed"
          description="Place plugins in the plugins directory to get started"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {plugins.map((plugin) => (
            <div key={plugin.name} className="card p-4 hover:shadow-md transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-astra-500/10">
                    <Package size={18} className="text-astra-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-medium text-[rgb(var(--color-text))]">{plugin.name}</h3>
                      <span className="text-xs text-[rgb(var(--color-text-secondary))]">v{plugin.version}</span>
                    </div>
                    <p className="text-xs text-[rgb(var(--color-text-secondary))]">{plugin.type}</p>
                  </div>
                </div>
                <span className={`text-xs font-medium capitalize ${getStatusColor(plugin.status)}`}>
                  {plugin.status}
                </span>
              </div>

              {plugin.description && (
                <p className="text-sm text-[rgb(var(--color-text-secondary))] mb-3">{plugin.description}</p>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-[rgb(var(--color-border))]">
                <span className="text-xs text-[rgb(var(--color-text-secondary))]">
                  by {plugin.author || 'Unknown'}
                </span>
                <div className="flex items-center gap-2">
                  <button className="btn-ghost p-1.5" title="Toggle plugin">
                    {plugin.status === 'active' ? (
                      <ToggleRight size={16} className="text-green-500" />
                    ) : (
                      <ToggleLeft size={16} className="text-[rgb(var(--color-text-secondary))]" />
                    )}
                  </button>
                  <button className="btn-ghost p-1.5 text-red-500 hover:text-red-400" title="Remove plugin">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

