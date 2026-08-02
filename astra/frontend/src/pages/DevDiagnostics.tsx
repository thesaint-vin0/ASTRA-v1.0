import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Activity, Battery, Boxes, ClipboardCopy, Cpu, Database, Gauge,
  Globe, HardDrive, MemoryStick, MessageSquareCode, Plug, RefreshCw,
  Server, ShieldAlert, Terminal, Wifi, Cpu as CpuIcon, CheckCircle2, XCircle
} from 'lucide-react'
import { useRouteFocus } from '../hooks/useRouteFocus'
import { api } from '../services/api'
import wsService from '../services/websocket'
import type { ConnectionQuality } from '../services/websocket'
import type { SystemMetrics, SystemStatus } from '../types'
import { showToast } from '../components/Toast'

interface SystemInfo {
  platform: string
  arch: string
  electronVersion: string
  nodeVersion: string
  chromeVersion: string
}

interface InfoRowProps {
  label: string
  value: React.ReactNode
  icon: React.ReactNode
  status?: 'ok' | 'warn' | 'error' | 'info'
}

function StatusDot({ status }: { status: 'ok' | 'warn' | 'error' | 'info' }) {
  const cls = {
    ok: 'bg-green-500',
    warn: 'bg-yellow-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
  }[status]
  return <span className={`inline-block w-2 h-2 rounded-full ${cls} mr-1.5`} aria-hidden="true" />
}

function InfoRow({ label, value, icon, status = 'info' }: InfoRowProps) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-[rgb(var(--color-border))]/50 last:border-0">
      <span className="flex items-center gap-2 text-xs text-[rgb(var(--color-text-secondary))]">
        <span className="text-astra-400 flex-shrink-0">{icon}</span>
        {label}
      </span>
      <span className="flex items-center text-xs font-medium text-[rgb(var(--color-text))]">
        <StatusDot status={status} />
        {value}
      </span>
    </div>
  )
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="card p-4">
      <h2 className="text-sm font-semibold text-[rgb(var(--color-text))] flex items-center gap-2 mb-3">
        <span className="text-astra-400">{icon}</span>
        {title}
      </h2>
      <div>{children}</div>
    </div>
  )
}

export default function DevDiagnostics() {
  const { ref: headingRef } = useRouteFocus()
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null)
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null)
  const [status, setStatus] = useState<SystemStatus | null>(null)
  const [quality, setQuality] = useState<ConnectionQuality | null>(null)
  const [crashLogs, setCrashLogs] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const refresh = useCallback(async () => {
    setRefreshing(true)
    try {
      const [sysInfo, met, st, q, logs] = await Promise.allSettled([
        window.electronAPI?.getSystemInfo() ?? Promise.resolve(null),
        api.system.metrics(),
        api.status(),
        Promise.resolve(wsService.getQuality()),
        window.electronAPI?.getCrashLogs?.() ?? Promise.resolve({ success: false, logs: '' }),
      ])
      if (sysInfo.status === 'fulfilled') setSystemInfo(sysInfo.value)
      if (met.status === 'fulfilled') setMetrics(met.value)
      if (st.status === 'fulfilled') setStatus(st.value as SystemStatus)
      if (q.status === 'fulfilled') setQuality(q.value)
      if (logs.status === 'fulfilled') setCrashLogs(logs.value?.logs ?? '')
    } catch {
      // Individual fetches are handled by allSettled; nothing to do here.
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const buildReport = useCallback((): string => {
    const lines: string[] = []
    lines.push('=== ASTRA DIAGNOSTIC REPORT ===')
    lines.push(`Generated: ${new Date().toISOString()}`)
    lines.push('')
    lines.push('--- System ---')
    if (systemInfo) {
      lines.push(`Platform: ${systemInfo.platform} (${systemInfo.arch})`)
      lines.push(`Electron: ${systemInfo.electronVersion}`)
      lines.push(`Chromium: ${systemInfo.chromeVersion}`)
      lines.push(`Node: ${systemInfo.nodeVersion}`)
    } else {
      lines.push('Platform: (running in browser)')
    }
    lines.push('')
    lines.push('--- Backend ---')
    if (metrics) {
      lines.push(`Backend version: ${metrics.version}`)
      lines.push(`Uptime: ${metrics.uptime}s`)
      lines.push(`Platform: ${metrics.platform}`)
      lines.push(`CPU: ${metrics.cpu.usage_percent}% (${metrics.cpu.cores} cores)`)
      lines.push(`RAM: ${metrics.memory.used_gb}GB / ${metrics.memory.total_gb}GB (${metrics.memory.usage_percent}%)`)
      lines.push(`Disk: ${metrics.disk.free_gb}GB free / ${metrics.disk.total_gb}GB total`)
      lines.push(`GPU: ${metrics.gpu.available ? `yes (${metrics.gpu.name})` : 'no'}`)
      lines.push(`Ollama: ${metrics.ollama.status} (${metrics.ollama.models.length} models)`)
      lines.push(`Database: ${metrics.database.status}`)
      lines.push(`ChromaDB: ${metrics.chroma.status}`)
      lines.push(`Plugins: ${metrics.plugins.active}/${metrics.plugins.total} active (${metrics.plugins.errors} errors)`)
    }
    lines.push('')
    if (status?.engine) {
      lines.push('--- Engine ---')
      lines.push(`Active conversations: ${status.engine.active_conversations ?? 0}`)
      lines.push(`Active tasks: ${status.engine.active_tasks ?? 0}`)
      lines.push(`Short-term memories: ${status.engine.short_term_memories ?? 0}`)
      lines.push(`Available tools: ${status.engine.available_tools ?? 0}`)
      lines.push(`Systems initialized: ${status.engine.systems_initialized ?? false}`)
      lines.push('')
    }
    lines.push('--- WebSocket ---')
    lines.push(`RTT: ${quality?.rttMs ?? 'N/A'}ms`)
    lines.push(`Bandwidth: ${quality?.bandwidth ?? 'unknown'}`)
    lines.push(`Reconnects: ${quality?.consecutiveReconnects ?? 0}`)
    lines.push(`Total messages received: ${quality?.totalMessagesReceived ?? 0}`)
    lines.push(`Total messages sent: ${quality?.totalMessagesSent ?? 0}`)

    if (crashLogs.trim()) {
      lines.push('')
      lines.push('--- Crash Logs ---')
      lines.push(crashLogs)
    }
    return lines.join('\n')
  }, [systemInfo, metrics, status, quality, crashLogs])

  const handleCopy = useCallback(async () => {
    const report = buildReport()
    try {
      await navigator.clipboard.writeText(report)
      showToast({ type: 'success', title: 'Diagnostic report copied to clipboard' })
    } catch {
      showToast({ type: 'error', title: 'Failed to copy diagnostic report' })
    }
  }, [buildReport])

  const wsStatus: 'ok' | 'warn' | 'error' = wsService.isConnected
    ? (quality?.rttMs != null && quality.rttMs > 400 ? 'warn' : 'ok')
    : 'error'

  if (loading) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-center py-24" role="status" aria-live="polite">
          <div className="w-8 h-8 border-2 border-astra-500 border-t-transparent rounded-full animate-spin" />
          <p className="ml-3 text-sm text-[rgb(var(--color-text-secondary))]">Gathering diagnostics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-bold text-[rgb(var(--color-text))] focus:outline-none">Developer Diagnostics</h1>
          <p className="text-sm text-[rgb(var(--color-text-secondary))] mt-1">
            System diagnostics, connectivity, and live metrics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={refresh} className="btn-ghost text-xs flex items-center gap-1" aria-label="Refresh diagnostics">
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> Refresh
          </button>
          <button onClick={handleCopy} className="btn-primary text-xs flex items-center gap-1" aria-label="Copy diagnostic report">
            <ClipboardCopy size={14} /> Copy Report
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* System */}
        <Section title="System" icon={<Server size={14} />}>
          <InfoRow label="Platform" value={systemInfo ? `${systemInfo.platform} ${systemInfo.arch}` : 'Browser'} icon={<HardDrive size={12} />} status="info" />
          <InfoRow label="Electron" value={systemInfo?.electronVersion ?? 'N/A'} icon={<Boxes size={12} />} status="info" />
          <InfoRow label="Chromium" value={systemInfo?.chromeVersion ?? 'N/A'} icon={<Globe size={12} />} status="info" />
          <InfoRow label="Node.js" value={systemInfo?.nodeVersion ?? 'N/A'} icon={<Terminal size={12} />} status="info" />
        </Section>

        {/* Backend & AI */}
        <Section title="Backend & AI" icon={<CpuIcon size={14} />}>
          <InfoRow label="Backend version" value={metrics?.version ?? 'N/A'} icon={<Server size={12} />} status="info" />
          <InfoRow label="Python (Ollama)" value={metrics?.ollama.version ?? 'N/A'} icon={<Cpu size={12} />} status={metrics?.ollama.status === 'running' ? 'ok' : metrics?.ollama.status === 'not_found' ? 'warn' : 'error'} />
          <InfoRow label="Ollama models" value={`${metrics?.ollama.models?.length ?? 0} loaded`} icon={<Boxes size={12} />} status={metrics?.ollama.status === 'running' ? 'ok' : 'warn'} />
          <InfoRow label="Database" value={metrics?.database.status ?? 'unknown'} icon={<Database size={12} />} status={metrics?.database.status === 'connected' ? 'ok' : 'error'} />
          <InfoRow label="ChromaDB" value={metrics?.chroma.status ?? 'unknown'} icon={<MemoryStick size={12} />} status={metrics?.chroma.status === 'initialized' ? 'ok' : 'error'} />
        </Section>

        {/* Connectivity */}
        <Section title="Connectivity" icon={<Wifi size={14} />}>
          <InfoRow label="WebSocket" value={wsService.isConnected ? 'connected' : 'disconnected'} icon={<Wifi size={12} />} status={wsStatus} />
          <InfoRow label="Round-trip time" value={quality?.rttMs != null ? `${quality.rttMs}ms` : 'N/A'} icon={<Gauge size={12} />} status={wsStatus} />
          <InfoRow label="Bandwidth" value={quality?.bandwidth ?? 'unknown'} icon={<Activity size={12} />} status={wsStatus} />
          <InfoRow label="Reconnects" value={quality?.consecutiveReconnects ?? 0} icon={<RefreshCw size={12} />} status="info" />
          <InfoRow label="Messages rx/tx" value={`${quality?.totalMessagesReceived ?? 0} / ${quality?.totalMessagesSent ?? 0}`} icon={<MessageSquareCode size={12} />} status="info" />
        </Section>

        {/* Resources */}
        <Section title="Resources" icon={<Activity size={14} />}>
          <InfoRow label="CPU usage" value={metrics ? `${metrics.cpu.usage_percent}% (${metrics.cpu.cores} cores)` : 'N/A'} icon={<CpuIcon size={12} />} status={metrics && metrics.cpu.usage_percent > 80 ? 'warn' : 'ok'} />
          <InfoRow label="RAM usage" value={metrics ? `${metrics.memory.used_gb}GB / ${metrics.memory.total_gb}GB` : 'N/A'} icon={<MemoryStick size={12} />} status={metrics && metrics.memory.usage_percent > 80 ? 'warn' : 'ok'} />
          <InfoRow label="Disk free" value={metrics ? `${metrics.disk.free_gb}GB / ${metrics.disk.total_gb}GB` : 'N/A'} icon={<HardDrive size={12} />} status={metrics && metrics.disk.usage_percent > 85 ? 'warn' : 'ok'} />
          <InfoRow label="GPU" value={metrics?.gpu.available ? `${metrics.gpu.name}` : 'Not available'} icon={<Battery size={12} />} status={metrics?.gpu.available ? 'ok' : 'error'} />
        </Section>

        {/* Engine */}
        <Section title="Engine" icon={<MessageSquareCode size={14} />}>
          <InfoRow label="Active conversations" value={status?.engine?.active_conversations ?? 'N/A'} icon={<MessageSquareCode size={12} />} status="info" />
          <InfoRow label="Active tasks" value={status?.engine?.active_tasks ?? 'N/A'} icon={<Activity size={12} />} status="info" />
          <InfoRow label="Short-term memories" value={status?.engine?.short_term_memories ?? 'N/A'} icon={<MemoryStick size={12} />} status="info" />
          <InfoRow label="Available tools" value={status?.engine?.available_tools ?? 'N/A'} icon={<Plug size={12} />} status="info" />
          <InfoRow label="Systems initialized" value={status?.engine?.systems_initialized ? 'yes' : 'no'} icon={status?.engine?.systems_initialized ? <CheckCircle2 size={12} /> : <ShieldAlert size={12} />} status={status?.engine?.systems_initialized ? 'ok' : 'warn'} />
        </Section>

        {/* Plugins */}
        <Section title="Plugins" icon={<Plug size={14} />}>
          <InfoRow label="Total" value={metrics?.plugins?.total ?? 'N/A'} icon={<Boxes size={12} />} status="info" />
          <InfoRow label="Active" value={metrics?.plugins?.active ?? 'N/A'} icon={<CheckCircle2 size={12} />} status="ok" />
          <InfoRow label="Errors" value={metrics?.plugins?.errors ?? 'N/A'} icon={<XCircle size={12} />} status={metrics?.plugins?.errors && metrics.plugins.errors > 0 ? 'error' : 'ok'} />
        </Section>
      </div>

      {/* Application Logs */}
      <div className="card p-4 mt-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-[rgb(var(--color-text))] flex items-center gap-2">
            <Terminal size={14} className="text-astra-400" /> Application Logs
          </h2>
          <button onClick={refresh} className="btn-ghost text-xs" aria-label="Reload logs">
            <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>
        {crashLogs.trim() ? (
          <pre className="text-xs font-mono text-[rgb(var(--color-text-secondary))] bg-[rgb(var(--color-bg))] p-3 rounded-lg max-h-72 overflow-auto scrollbar-thin whitespace-pre-wrap">
            {crashLogs}
          </pre>
        ) : (
          <p className="text-xs text-[rgb(var(--color-text-secondary))] text-center py-6">
            <motion.span
              className="inline-flex items-center gap-1.5 text-green-500"
              animate={{ opacity: [1, 0.6, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <CheckCircle2 size={14} /> No crash logs recorded
            </motion.span>
          </p>
        )}
      </div>
    </div>
  )
}

