import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Activity, AlertTriangle, RefreshCw, Cpu } from 'lucide-react'
import { memoryLeakDetector } from '../services/memoryLeakDetector'

export default function MemoryMonitor() {
  const [stats, setStats] = useState(memoryLeakDetector.getStats())
  const [alerts, setAlerts] = useState<Array<{ level: string; message: string; timestamp: number }>>([])
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    memoryLeakDetector.start()

    const unsub = memoryLeakDetector.onLeakDetected((level, details) => {
      setAlerts((prev) => [
        { level, message: `Memory ${level}: ${details.increasePercent}% increase (${details.currentMB}MB vs baseline ${details.baselineMB}MB)`, timestamp: Date.now() },
        ...prev.slice(0, 9),
      ])
    })

    const interval = setInterval(() => {
      setStats(memoryLeakDetector.getStats())
    }, 10000)

    return () => {
      unsub()
      clearInterval(interval)
      memoryLeakDetector.stop()
    }
  }, [])

  const currentMB = stats.currentMB
  const growthPercent = stats.growthPercent
  const isWarning = growthPercent >= 20 && growthPercent < 50
  const isCritical = growthPercent >= 50

  const getStatusColor = () => {
    if (isCritical) return 'text-red-500'
    if (isWarning) return 'text-yellow-500'
    return 'text-green-500'
  }

  const getBgColor = () => {
    if (isCritical) return 'bg-red-500/10 border-red-500/20'
    if (isWarning) return 'bg-yellow-500/10 border-yellow-500/20'
    return 'bg-green-500/10 border-green-500/20'
  }

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setVisible(!visible)}
        className="fixed bottom-4 left-20 z-40 p-2 rounded-lg bg-[rgb(var(--color-surface))] border border-[rgb(var(--color-border))] shadow-lg hover:bg-[rgb(var(--color-surface-hover))] transition-all"
        title="Toggle memory monitor"
        aria-label="Toggle memory monitor"
      >
        <Activity size={16} className={getStatusColor()} />
      </button>

      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="fixed bottom-14 left-20 z-40 w-80 rounded-xl border shadow-2xl backdrop-blur-sm"
            style={{ backgroundColor: 'rgb(var(--color-surface))', borderColor: 'rgb(var(--color-border))' }}
          >
            <div className="p-3 border-b border-[rgb(var(--color-border))]">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-[rgb(var(--color-text))] flex items-center gap-1.5">
                  <Cpu size={14} className="text-astra-400" />
                  Memory Monitor
                </h3>
                <button
                  onClick={() => { memoryLeakDetector.reset(); setAlerts([]) }}
                  className="btn-ghost p-1"
                  title="Reset monitoring"
                  aria-label="Reset monitoring"
                >
                  <RefreshCw size={12} />
                </button>
              </div>
            </div>

            <div className="p-3 space-y-3">
              {/* Current stats */}
              <div className={`flex items-center justify-between p-2 rounded-lg border ${getBgColor()}`}>
                <span className="text-xs text-[rgb(var(--color-text))]">Heap Usage</span>
                <span className={`text-xs font-mono font-bold ${getStatusColor()}`}>
                  {currentMB}MB
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-[rgb(var(--color-text-secondary))]">Growth vs Baseline</span>
                <span className={`text-[10px] font-mono font-bold ${getStatusColor()}`}>
                  {growthPercent > 0 ? '+' : ''}{growthPercent}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-[rgb(var(--color-text-secondary))]">Samples Collected</span>
                <span className="text-[10px] font-mono text-[rgb(var(--color-text-secondary))]">{stats.samples}</span>
              </div>

              {/* Alerts */}
              {alerts.length > 0 && (
                <div className="space-y-1 max-h-[120px] overflow-y-auto scrollbar-thin">
                  {alerts.map((alert, i) => (
                    <div
                      key={i}
                      className={`flex items-start gap-1.5 p-1.5 rounded text-[10px] ${
                        alert.level === 'critical' ? 'bg-red-500/5' : 'bg-yellow-500/5'
                      }`}
                    >
                      <AlertTriangle
                        size={10}
                        className={alert.level === 'critical' ? 'text-red-500 mt-0.5' : 'text-yellow-500 mt-0.5'}
                      />
                      <span className="text-[rgb(var(--color-text-secondary))]">{alert.message}</span>
                    </div>
                  ))}
                </div>
              )}

              {alerts.length === 0 && (
                <p className="text-[10px] text-[rgb(var(--color-text-secondary))] text-center">
                  No memory issues detected. Monitoring in background...
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
