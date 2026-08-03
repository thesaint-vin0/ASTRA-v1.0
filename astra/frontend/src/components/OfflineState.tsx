import { memo } from 'react'
import { motion } from 'framer-motion'
import { WifiOff, RefreshCw } from 'lucide-react'

interface OfflineStateProps {
  title?: string
  description?: string
  onRetry?: () => void
  className?: string
}

function OfflineStateBase({
  title = 'You are offline',
  description = 'Check your connection and try again.',
  onRetry,
  className = '',
}: OfflineStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={`flex flex-col items-center justify-center py-16 text-center ${className}`}
      role="status"
      aria-live="polite"
    >
      <div className="mb-4 text-yellow-500" aria-hidden="true">
        <WifiOff size={48} />
      </div>
      <h3 className="text-lg font-semibold text-[rgb(var(--color-text))] mb-1">{title}</h3>
      <p className="text-sm text-[rgb(var(--color-text-secondary))] max-w-sm mb-4">{description}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-primary flex items-center gap-2 text-sm">
          <RefreshCw size={14} />
          Retry
        </button>
      )}
    </motion.div>
  )
}

const OfflineState = memo(OfflineStateBase)
export default OfflineState

