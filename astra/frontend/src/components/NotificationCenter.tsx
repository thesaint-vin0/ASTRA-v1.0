import { useAppStore } from '../stores/appStore'
import { useShallow } from 'zustand/react/shallow'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'
import { useEffect } from 'react'

const icons = {
  success: <CheckCircle size={16} className="text-green-500" />,
  error: <AlertCircle size={16} className="text-red-500" />,
  warning: <AlertTriangle size={16} className="text-yellow-500" />,
  info: <Info size={16} className="text-blue-500" />,
}

export default function NotificationCenter() {
  const { notifications, removeNotification } = useAppStore(useShallow((s) => ({
    notifications: s.notifications,
    removeNotification: s.removeNotification,
  })))

  useEffect(() => {
    notifications.forEach((n) => {
      const timer = setTimeout(() => removeNotification(n.id), 5000)
      return () => clearTimeout(timer)
    })
  }, [notifications, removeNotification])

  if (notifications.length === 0) return null

  return (
    <div
      className="fixed bottom-4 right-4 z-50 space-y-2"
      role="region"
      aria-label="Notification center"
    >
      <div aria-live="polite" aria-atomic="false" className="sr-only">
        {notifications.map((n) => n.message).join('. ')}
      </div>
      {notifications.map((n) => (
        <div
          key={n.id}
          className="flex items-center gap-2 px-4 py-3 bg-[rgb(var(--color-surface))] border border-[rgb(var(--color-border))] rounded-lg shadow-lg animate-slide-up min-w-[300px] max-w-[400px]"
          role="status"
        >
          <span aria-hidden="true">{icons[n.type]}</span>
          <p className="text-sm text-[rgb(var(--color-text))] flex-1">{n.message}</p>
          <button
            onClick={() => removeNotification(n.id)}
            className="text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-text))]"
            aria-label="Dismiss notification"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}

