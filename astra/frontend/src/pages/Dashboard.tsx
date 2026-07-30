import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  MessageSquare, Brain, Cpu, Activity, Server, Zap,
  Bot, RefreshCw, Gauge, BarChart3,
  Plug, FileText, Settings, Wrench, BookOpen,
  HelpCircle, GraduationCap
} from 'lucide-react'
import { api } from '../services/api'
import { useAppStore } from '../stores/appStore'
import type { SystemMetrics, ActivityEvent } from '../types'

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m`
}

function TimeAgo({ timestamp }: { timestamp: string }) {
  const diff = Date.now() - new Date(timestamp).getTime()
  const mins = Math.floor(diff / 60000)
  const hrs = Math.floor(mins / 60)
  let text = 'just now'
  if (mins >= 1 && mins < 60) text = `${mins}m ago`
  else if (hrs < 24) text = `${hrs}h ago`
  else text = `${Math.floor(hrs / 24)}d ago`
  return <span className="text-[10px] text-[rgb(var(--color-text-secondary))]">{text}</span>
}

function StatusBadge({ status, label }: { status: string; label: string }) {
  const colorMap: Record<string, string> = {
    running: 'bg-green-500/10 text-green-500 border-green-500/20',
    connected: 'bg-green-500/10 text-green-500 border-green-500/20',
    initialized: 'bg-green-500/10 text-green-500 border-green-500/20',
    not_found: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    warning: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    error: 'bg-red-500/10 text-red-500 border-red-500/20',
    missing: 'bg-red-500/10 text-red-500 border-red-500/20',
  }
  const dotMap: Record<string, string> = {
    running: 'bg-green-500', connected: 'bg-green-500', initialized: 'bg-green-500',
    not_found: 'bg-yellow-500', warning: 'bg-yellow-500',
    error: 'bg-red-500', missing: 'bg-red-500',
  }
  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-medium ${colorMap[status] ?? ''}`}>
      <div className={`w-1.5 h-1.5 rounded-full ${dotMap[status] ?? 'bg-gray-500'}`} />
      {label}
    </div>
  )
}

function ActivityIcon({ type }: { type: string }) {
  const icons: Record<string, React.ReactNode> = {
    conversation: <MessageSquare size={12} className="text-blue-500" />,
    memory: <Brain size={12} className="text-purple-500" />,
    model: <Cpu size={12} className="text-green-500" />,
    plugin: <Plug size={12} className="text-pink-500" />,
    system: <Server size={12} className="text-orange-500" />,
    update: <RefreshCw size={12} className="text-cyan-500" />,
    error: <Activity size={12} className="text-red-500" />,
    file: <FileText size={12} className="text-yellow-500" />,
  }
  return <>{icons[type] ?? <Activity size={12} />}</>
}

function GaugeChart({ value, label, color }: { value: number; label: string; color: string }) {
  const clamped = Math.min(Math.max(value, 0), 100)
  const circ = 138.2
  const offset = circ - (clamped / 100) * circ
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={56} height={56} className="transform -rotate-90">
        <circle cx={28} cy={28} r={22} fill="none" stroke="rgb(var(--color-surface))" strokeWidth="4" />
        <circle cx={28} cy={28} r={22} fill="none" stroke="currentColor" strokeWidth="4"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" className={color} />
      </svg>
      <span className={`text-lg font-bold ${color}`}>{Math.round(clamped)}%</span>
      <span className="text-[10px] text-[rgb(var(--color-text-secondary))]">{label}</span>
    </div>
  )
}

function AiStatusWidget({ isConnected, metrics }: { isConnected: boolean; metrics: SystemMetrics | null }) {
  const navigate = useNavigate()
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold flex items-center gap-1.5 text-[rgb(var(--color-text))]">
          <Bot size={16} className="text-astra-400" /> AI Status
        </h3>
        <StatusBadge status={isConnected ? 'running' : 'error'} label={isConnected ? 'Online' : 'Offline'} />
      </div>
      <div className="space-y-2 text-xs">
        <div className="flex justify-between">
          <span className="text-[rgb(var(--color-text-secondary))]">Backend</span>
          <span className="font-medium text-[rgb(var(--color-text))]">{metrics ? metrics.version : '...'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[rgb(var(--color-text-secondary))]">Ollama</span>
          <span className={`font-medium ${metrics?.ollama.status === 'running' ? 'text-green-500' : 'text-yellow-500'}`}>
            {metrics ? `${metrics.ollama.models.length} models` : '...'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[rgb(var(--color-text-secondary))]">Database</span>
          <StatusBadge status={metrics?.database.status ?? 'error'} label={metrics?.database.status ?? 'Unknown'} />
        </div>
        <div className="flex justify-between">
          <span className="text-[rgb(var(--color-text-secondary))]">Vector Store</span>
          <StatusBadge status={metrics?.chroma.status ?? 'error'} label={metrics?.chroma.status ?? 'Unknown'} />
        </div>
        <div className="flex justify-between">
          <span className="text-[rgb(var(--color-text-secondary))]">Plugins</span>
          <StatusBadge status={(metrics?.plugins.errors ?? 0) > 0 ? 'error' : 'running'} label={metrics ? `${metrics.plugins.active}/${metrics.plugins.total} active` : '...'} />
        </div>
        <button onClick={() => navigate('/chat')} className="w-full mt-3 btn-primary text-xs py-1.5 flex items-center justify-center gap-1">
          <MessageSquare size={12} /> Open Chat
        </button>
      </div>
    </div>
  )
}

function SystemStatusWidget({ metrics }: { metrics: SystemMetrics | null }) {
  const items = [
    { label: 'Backend', status: metrics ? 'running' : 'error', detail: metrics?.version },
    { label: 'Ollama', status: metrics?.ollama.status ?? 'not_found', detail: metrics?.ollama.version },
    { label: 'Database', status: metrics?.database.status ?? 'error', detail: metrics?.database.size_mb ? `${metrics.database.size_mb}MB` : '' },
    { label: 'Vector Store', status: metrics?.chroma.status ?? 'error', detail: metrics?.chroma.document_count ? `${metrics.chroma.document_count} docs` : '' },
    { label: 'GPU', status: metrics?.gpu.available ? 'running' : 'missing', detail: metrics?.gpu.available ? metrics.gpu.name : 'Not available' },
    { label: 'Plugins', status: (metrics?.plugins.errors ?? 0) > 0 ? 'error' : 'running', detail: `${metrics?.plugins.active ?? 0} active` },
  ]
  return (
    <div className="card p-4">
      <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5 text-[rgb(var(--color-text))]">
        <Server size={16} className="text-astra-400" /> System Status
      </h3>
      <div className="space-y-1.5">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between py-1">
            <span className="text-xs text-[rgb(var(--color-text-secondary))]">{item.label}</span>
            <div className="flex items-center gap-2">
              {item.detail && <span className="text-[10px] text-[rgb(var(--color-text-secondary))]">{item.detail}</span>}
              <StatusBadge status={item.status} label={item.status === 'running' ? 'OK' : item.status} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function SystemMetricsWidget({ metrics }: { metrics: SystemMetrics | null }) {
  return (
    <div className="card p-4 lg:col-span-2">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold flex items-center gap-1.5 text-[rgb(var(--color-text))]">
          <BarChart3 size={16} className="text-astra-400" /> System Metrics
        </h3>
        <span className="text-[10px] text-[rgb(var(--color-text-secondary))] flex items-center gap-1"><Gauge size={12} /> Auto-refresh 15s</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <GaugeChart value={metrics?.cpu.usage_percent ?? 0} label="CPU" color="text-blue-500" />
        <GaugeChart value={metrics?.memory.usage_percent ?? 0} label="RAM" color="text-purple-500" />
        <GaugeChart value={metrics?.disk.usage_percent ?? 0} label="Disk" color="text-yellow-500" />
        <div className="flex flex-col items-center gap-1">
          <span className={`text-lg font-bold ${metrics?.gpu.available ? 'text-green-500' : ''}`}>
            {metrics?.gpu.available ? `${metrics.gpu.usage_percent ?? 0}%` : 'N/A'}
          </span>
          <span className="text-[10px] text-[rgb(var(--color-text-secondary))]">GPU</span>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3 pt-3 border-t border-[rgb(var(--color-border))]">
        <div className="text-center">
          <p className="text-xs font-bold text-[rgb(var(--color-text))]">{metrics?.cpu.cores ?? '?'}</p>
          <p className="text-[10px] text-[rgb(var(--color-text-secondary))]">CPU Cores</p>
        </div>
        <div className="text-center">
          <p className="text-xs font-bold text-[rgb(var(--color-text))]">{metrics?.memory.total_gb ?? '?'}GB</p>
          <p className="text-[10px] text-[rgb(var(--color-text-secondary))]">Total RAM</p>
        </div>
        <div className="text-center">
          <p className="text-xs font-bold text-[rgb(var(--color-text))]">{metrics?.disk.free_gb ?? '?'}GB</p>
          <p className="text-[10px] text-[rgb(var(--color-text-secondary))]">Free Disk</p>
        </div>
        <div className="text-center">
          <p className="text-xs font-bold text-[rgb(var(--color-text))]">{metrics?.gpu.available ? `${metrics.gpu.vram_total_gb ?? '?'}GB` : 'N/A'}</p>
          <p className="text-[10px] text-[rgb(var(--color-text-secondary))]">VRAM</p>
        </div>
      </div>
    </div>
  )
}

function ActivityFeedWidget({ activity }: { activity: ActivityEvent[] }) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold flex items-center gap-1.5 text-[rgb(var(--color-text))]">
          <Activity size={16} className="text-astra-400" /> Activity Feed
        </h3>
        <span className="text-[10px] text-[rgb(var(--color-text-secondary))]">{activity.length} events</span>
      </div>
      <div className="space-y-1 max-h-[280px] overflow-y-auto scrollbar-thin">
        {activity.length === 0 ? (
          <p className="text-xs text-[rgb(var(--color-text-secondary))] text-center py-4">No recent activity</p>
        ) : (
          activity.slice(0, 10).map((a) => (
            <div key={a.id} className="flex items-start gap-2 py-1.5 border-b border-[rgb(var(--color-border))]/50 last:border-0">
              <div className="mt-0.5"><ActivityIcon type={a.type} /></div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-[rgb(var(--color-text))] truncate">{a.title}</p>
                <p className="text-[10px] text-[rgb(var(--color-text-secondary))] truncate">{a.description}</p>
              </div>
              <TimeAgo timestamp={a.timestamp} />
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function QuickActionsWidget() {
  const navigate = useNavigate()
  const actions = [
    { label: 'New Chat', icon: <MessageSquare size={14} />, path: '/chat', color: 'text-blue-500 bg-blue-500/10' },
    { label: 'Memory', icon: <Brain size={14} />, path: '/memory', color: 'text-purple-500 bg-purple-500/10' },
    { label: 'Models', icon: <Cpu size={14} />, path: '/models', color: 'text-green-500 bg-green-500/10' },
    { label: 'Files', icon: <FileText size={14} />, path: '/files', color: 'text-yellow-500 bg-yellow-500/10' },
    { label: 'Plugins', icon: <Plug size={14} />, path: '/plugins', color: 'text-pink-500 bg-pink-500/10' },
    { label: 'Settings', icon: <Settings size={14} />, path: '/settings', color: 'text-gray-500 bg-gray-500/10' },
    { label: 'Tutorials', icon: <GraduationCap size={14} />, path: '/tutorials', color: 'text-orange-500 bg-orange-500/10' },
    { label: 'Help', icon: <HelpCircle size={14} />, path: '/help', color: 'text-cyan-500 bg-cyan-500/10' },
    { label: 'How It Works', icon: <BookOpen size={14} />, path: '/how-it-works', color: 'text-indigo-500 bg-indigo-500/10' },
  ]
  return (
    <div className="card p-4">
      <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5 text-[rgb(var(--color-text))]">
        <Zap size={16} className="text-astra-400" /> Quick Actions
      </h3>
      <div className="grid grid-cols-3 gap-2">
        {actions.map((a) => (
          <button key={a.label} onClick={() => navigate(a.path)}
            className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-[rgb(var(--color-bg))] transition-all text-center">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${a.color}`}>{a.icon}</div>
            <span className="text-[10px] font-medium text-[rgb(var(--color-text))] leading-tight">{a.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { isConnected } = useAppStore()
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null)
  const [activity, setActivity] = useState<ActivityEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const m = await api.system.metrics()
      const a = await api.activity(20)
      setMetrics(m)
      setActivity(a.activities ?? [])
      setError(null)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 15000)
    return () => clearInterval(interval)
  }, [fetchData])

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-[rgb(var(--color-text))]">Dashboard</h1>
            <StatusBadge status={isConnected ? 'connected' : 'error'} label={isConnected ? 'Connected' : 'Disconnected'} />
          </div>
          <p className="text-sm text-[rgb(var(--color-text-secondary))] mt-1">
            {metrics ? `${metrics.version} - Uptime: ${formatUptime(metrics.uptime)}` : 'System overview'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/settings')} className="btn-ghost text-xs flex items-center gap-1">
            <Wrench size={14} /> Customize
          </button>
          <button onClick={() => { setRefreshing(true); fetchData(); }}
            disabled={refreshing} className="btn-ghost p-2" title="Refresh">
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-500 flex items-center gap-2">
          <Activity size={16} /> {error}
        </div>
      )}

      {loading && (
        <div className="text-center py-20">
          <div className="w-10 h-10 border-2 border-astra-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-[rgb(var(--color-text-secondary))]">Loading dashboard data...</p>
        </div>
      )}

      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AiStatusWidget isConnected={isConnected} metrics={metrics} />
          <SystemStatusWidget metrics={metrics} />
          <SystemMetricsWidget metrics={metrics} />
          <ActivityFeedWidget activity={activity} />
          <QuickActionsWidget />
        </div>
      )}
    </div>
  )
}

