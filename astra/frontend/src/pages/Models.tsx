import { useState, useEffect } from 'react'
import { Cpu, Download, Trash2, RefreshCw, CheckCircle, XCircle, Server } from 'lucide-react'
import { api } from '../services/api'
import type { Model } from '../types'

export default function Models() {
  const [models, setModels] = useState<Model[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadModels()
  }, [])

  const loadModels = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.models.list()
      setModels(data.models)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const formatSize = (bytes: number) => {
    if (!bytes) return 'Unknown'
    const units = ['B', 'KB', 'MB', 'GB']
    let size = bytes
    for (const unit of units) {
      if (size < 1024) return `${size.toFixed(1)} ${unit}`
      size /= 1024
    }
    return `${size.toFixed(1)} TB`
  }

  const getProviderColor = (provider: string) => {
    switch (provider) {
      case 'ollama': return 'text-green-500'
      case 'openai': return 'text-blue-500'
      case 'anthropic': return 'text-purple-500'
      default: return 'text-gray-500'
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[rgb(var(--color-text))]">Model Manager</h1>
          <p className="text-sm text-[rgb(var(--color-text-secondary))] mt-1">
            {models.length} models available
          </p>
        </div>
        <button onClick={loadModels} className="btn-secondary flex items-center gap-2" disabled={loading}>
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="p-4 mb-6 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-500">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-2 border-astra-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-[rgb(var(--color-text-secondary))]">Loading models...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {models.map((model) => (
            <div key={model.name} className="card p-4 hover:shadow-md transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Cpu size={18} className={getProviderColor(model.provider)} />
                  <div>
                    <p className="text-sm font-medium text-[rgb(var(--color-text))]">{model.name}</p>
                    <p className="text-xs text-[rgb(var(--color-text-secondary))] capitalize">{model.provider}</p>
                  </div>
                </div>
                {model.available ? (
                  <CheckCircle size={16} className="text-green-500" />
                ) : (
                  <XCircle size={16} className="text-red-500" />
                )}
              </div>

              <div className="space-y-2 text-xs text-[rgb(var(--color-text-secondary))]">
                <div className="flex justify-between">
                  <span>Size</span>
                  <span className="font-medium">{formatSize(model.size)}</span>
                </div>
                {model.details && (
                  <>
                    {model.details.families && (
                      <div className="flex justify-between">
                        <span>Family</span>
                        <span className="font-medium">{(model.details.families as string[])?.join(', ')}</span>
                      </div>
                    )}
                    {model.details.parameter_size && (
                      <div className="flex justify-between">
                        <span>Parameters</span>
                        <span className="font-medium">{model.details.parameter_size as string}</span>
                      </div>
                    )}
                    {model.details.quantization_level && (
                      <div className="flex justify-between">
                        <span>Quantization</span>
                        <span className="font-medium">{model.details.quantization_level as string}</span>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="flex gap-2 mt-3 pt-3 border-t border-[rgb(var(--color-border))]">
                {!model.available && model.provider === 'ollama' && (
                  <button className="btn-primary text-xs py-1.5 flex items-center gap-1">
                    <Download size={12} />
                    Pull
                  </button>
                )}
                {model.available && model.provider === 'ollama' && (
                  <button className="btn-ghost text-xs py-1.5 text-red-500 flex items-center gap-1">
                    <Trash2 size={12} />
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

