import { memo } from 'react'
import { motion } from 'framer-motion'

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
  compact?: boolean
}

function EmptyStateBase({
  icon,
  title,
  description,
  action,
  className = '',
  compact = false,
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={`flex flex-col items-center justify-center text-center ${compact ? 'py-8' : 'py-16'} ${className}`}
    >
      {icon && (
        <div className={`text-[rgb(var(--color-text-secondary))] opacity-50 ${compact ? 'mb-2' : 'mb-4'}`} aria-hidden="true">
          {icon}
        </div>
      )}
      <h3 className={`font-semibold text-[rgb(var(--color-text))] mb-1 ${compact ? 'text-sm' : 'text-lg'}`}>{title}</h3>
      {description && (
        <p className={`text-[rgb(var(--color-text-secondary))] ${compact ? 'text-xs max-w-xs' : 'text-sm max-w-sm'} mb-4`}>{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </motion.div>
  )
}

const EmptyState = memo(EmptyStateBase)
export default EmptyState

