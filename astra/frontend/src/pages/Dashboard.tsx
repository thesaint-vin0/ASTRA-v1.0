import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  MessageSquare,
  Brain,
  Cpu,
  Activity,
  Server,
  Zap,
  Bot,
  Clock,
} from 'lucide-react'
import { api } from '../services/api'

interface StatusData {
  engine: Record<string, any>
  config: Record<string, any>
}

export default function Dashboard() {
  const [status, setStatus] = useState<StatusData | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const data = await api.status()
        setStatus(data)
      } catch (err) {
        console.error('Failed to fetch status:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchStatus()
    const interval = setInterval(fetchStatus, 30000)
    return () => clearInterval(interval)
  }, [])

  const stats = status?.engine || {}
  const config = status?.config || {}

  const cards = [
    {
      title: 'Conversations',
      value: stats.active_conversations ?? 0,
      icon: MessageSquare,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
      onClick: () => navigate('/chat'),
    },
    {
      title: 'Memories',
      value: stats.short_term_memories ?? 0,
      icon: Brain,
      color: 'text-purple-500',
      bg: 'bg-purple-500/10',
      onClick: () => navigate('/memory'),
    },
    {
      title: 'Models',
      value: stats.available_models?.length ?? 0,
      icon: Cpu,
      color: 'text-green-500',
      bg: 'bg-green-500/10',
      onClick: () => navigate('/models'),
    },
    {
      title: 'Tools',
      value: stats.available_tools ?? 0,
      icon: Zap,
      color: 'text-yellow-500',
      bg: 'bg-yellow-500/10',
      onClick: () => navigate('/tools'),
    },
    {
      title: 'Plugins',
      value: stats.plugins_loaded ?? 0,
      icon: Bot,
      color: 'text-pink-500',
      bg: 'bg-pink-500/10',
    },
    {
      title: 'Active Tasks',
      value: stats.active_tasks ?? 0,
      icon: Activity,
      color: 'text-orange-500',
      bg: 'bg-orange-500/10',
    },
  ]

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[rgb(var(--color-text))]">Dashboard</h1>
        <p className="text-sm text-[rgb(var(--color-text-secondary))] mt-1">
          {config.app_name} v{config.app_version} - {config.environment}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {cards.map((card) => (
          <button
            key={card.title}
            onClick={card.onClick}
            className="card p-4 hover:shadow-md transition-all duration-200 text-left"
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2 rounded-lg ${card.bg}`}>
                <card.icon size={20} className={card.color} />
              </div>
            </div>
            <p className="text-2xl font-bold text-[rgb(var(--color-text))]">
              {loading ? '-' : card.value}
            </p>
            <p className="text-sm text-[rgb(var(--color-text-secondary))]">{card.title}</p>
          </button>
        ))}
      </div>

      {/* System Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-[rgb(var(--color-text))] mb-4 flex items-center gap-2">
            <Server size={18} className="text-astra-400" />
            System Status
          </h2>
          <div className="space-y-3">
            <StatusRow label="Vector Store Size" value={`${stats.vector_store_size ?? 0} documents`} />
            <StatusRow label="Models Available" value={`${stats.available_models?.length ?? 0}`} />
            <StatusRow label="Systems Initialized" value={stats.systems_initialized ? 'Yes' : 'No'} status={stats.systems_initialized ? 'ok' : 'error'} />
            <StatusRow label="Default Model" value={config.default_local_model || 'N/A'} />
            <StatusRow label="Provider" value={config.local_model_provider || 'N/A'} />
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-semibold text-[rgb(var(--color-text))] mb-4 flex items-center gap-2">
            <Clock size={18} className="text-astra-400" />
            Quick Actions
          </h2>
          <div className="space-y-3">
            <QuickActionButton
              label="New Conversation"
              description="Start a new chat with Astra"
              onClick={() => navigate('/chat')}
            />
            <QuickActionButton
              label="Browse Memories"
              description="Search and manage your memories"
              onClick={() => navigate('/memory')}
            />
            <QuickActionButton
              label="Model Settings"
              description="Configure AI models"
              onClick={() => navigate('/models')}
            />
            <QuickActionButton
              label="Settings"
              description="Customize your experience"
              onClick={() => navigate('/settings')}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function StatusRow({ label, value, status }: { label: string; value: string; status?: 'ok' | 'error' }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-[rgb(var(--color-text-secondary))]">{label}</span>
      <div className="flex items-center gap-2">
        {status && (
          <div className={`w-1.5 h-1.5 rounded-full ${status === 'ok' ? 'bg-green-500' : 'bg-red-500'}`} />
        )}
        <span className="text-sm font-medium text-[rgb(var(--color-text))]">{value}</span>
      </div>
    </div>
  )
}

function QuickActionButton({ label, description, onClick }: { label: string; description: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between p-3 rounded-lg bg-[rgb(var(--color-bg))] hover:bg-opacity-80 transition-all text-left"
    >
      <div>
        <p className="text-sm font-medium text-[rgb(var(--color-text))]">{label}</p>
        <p className="text-xs text-[rgb(var(--color-text-secondary))]">{description}</p>
      </div>
      <Zap size={16} className="text-astra-400" />
    </button>
  )
}

