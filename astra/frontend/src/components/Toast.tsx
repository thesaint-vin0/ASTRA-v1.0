import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface ToastMessage {
  id: string
  type: ToastType
  title: string
  message?: string
  duration?: number
}

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
}

const colors = {
  success: 'border-green-500/30 bg-green-500/5',
  error: 'border-red-500/30 bg-red-500/5',
  info: 'border-blue-500/30 bg-blue-500/5',
  warning: 'border-yellow-500/30 bg-yellow-500/5',
}

const iconColors = {
  success: 'text-green-500',
  error: 'text-red-500',
  info: 'text-blue-500',
  warning: 'text-yellow-500',
}

// Global toast state
let globalToasts: ToastMessage[] = []
let globalSetToasts: ((toasts: ToastMessage[]) => void) | null = null

export function showToast(toast: Omit<ToastMessage, 'id'>): string {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 5)
  const newToast: ToastMessage = { ...toast, id, duration: toast.duration ?? 4000 }
  globalToasts = [...globalToasts, newToast]
  globalSetToasts?.(globalToasts)
  return id
}

export function dismissToast(id: string): void {
  globalToasts = globalToasts.filter((t) => t.id !== id)
  globalSetToasts?.(globalToasts)
}

export function clearToasts(): void {
  globalToasts = []
  globalSetToasts?.(globalToasts)
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  useEffect(() => {
    globalSetToasts = setToasts
    return () => {
      globalSetToasts = null
    }
  }, [])

  const removeToast = useCallback((id: string) => {
    globalToasts = globalToasts.filter((t) => t.id !== id)
    setToasts([...globalToasts])
  }, [])

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={removeToast} />
        ))}
      </AnimatePresence>
    </div>
  )
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: ToastMessage
  onDismiss: (id: string) => void
}) {
  useEffect(() => {
    if (toast.duration && toast.duration > 0) {
      const timer = setTimeout(() => onDismiss(toast.id), toast.duration)
      return () => clearTimeout(timer)
    }
  }, [toast.id, toast.duration, onDismiss])

  const Icon = icons[toast.type]

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg backdrop-blur-sm ${colors[toast.type]}`}
      style={{ backgroundColor: 'rgb(var(--color-surface))' }}
    >
      <Icon size={18} className={`flex-shrink-0 mt-0.5 ${iconColors[toast.type]}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[rgb(var(--color-text))]">{toast.title}</p>
        {toast.message && (
          <p className="text-xs text-[rgb(var(--color-text-secondary))] mt-0.5">
            {toast.message}
          </p>
        )}
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="flex-shrink-0 text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-text))] transition-colors"
      >
        <X size={14} />
      </button>
    </motion.div>
  )
}

