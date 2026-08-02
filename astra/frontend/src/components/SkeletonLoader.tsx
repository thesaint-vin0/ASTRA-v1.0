import { memo } from 'react'

interface SkeletonProps {
  className?: string
  variant?: 'text' | 'circular' | 'rectangular' | 'card'
  width?: string | number
  height?: string | number
  count?: number
}

function SkeletonBase({ className = '', variant = 'text', width, height }: SkeletonProps) {
  const baseClass = 'animate-pulse bg-[rgb(var(--color-surface-hover))] rounded'
  const variantClass = {
    text: 'h-4 w-full rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
    card: 'rounded-xl',
  }[variant]

  return (
    <div
      className={`${baseClass} ${variantClass} ${className}`}
      style={{
        width: width ?? (variant === 'circular' ? 40 : undefined),
        height: height ?? (variant === 'circular' ? 40 : variant === 'text' ? 16 : undefined),
      }}
      aria-hidden="true"
    />
  )
}

const Skeleton = memo(SkeletonBase)

export function SkeletonText({ lines = 3, className = '' }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant="text"
          width={i === lines - 1 ? '60%' : '100%'}
        />
      ))}
    </div>
  )
}

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`card p-4 space-y-3 ${className}`} aria-hidden="true">
      <div className="flex items-center gap-3">
        <Skeleton variant="circular" width={40} height={40} />
        <div className="flex-1 space-y-1.5">
          <Skeleton variant="text" width="40%" />
          <Skeleton variant="text" width="60%" />
        </div>
      </div>
      <SkeletonText lines={2} />
      <Skeleton variant="text" width="30%" />
    </div>
  )
}

export function SkeletonTable({ rows = 5, cols = 4, className = '' }: { rows?: number; cols?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`} aria-hidden="true">
      {/* Header */}
      <div className="flex gap-4 pb-2">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} variant="text" width={`${100 / cols}%`} />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={rowIdx} className="flex gap-4">
          {Array.from({ length: cols }).map((_, colIdx) => (
            <Skeleton key={colIdx} variant="text" width={`${100 / cols}%`} />
          ))}
        </div>
      ))}
    </div>
  )
}

export function SkeletonList({ items = 5, className = '' }: { items?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`} aria-hidden="true">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3">
          <Skeleton variant="circular" width={32} height={32} />
          <div className="flex-1 space-y-1">
            <Skeleton variant="text" width={`${40 + Math.random() * 40}%`} />
            <Skeleton variant="text" width={`${30 + Math.random() * 30}%`} />
          </div>
        </div>
      ))}
    </div>
  )
}

export function SkeletonDashboard({ className = '' }: { className?: string }) {
  return (
    <div className={`p-6 max-w-7xl mx-auto space-y-6 ${className}`} aria-hidden="true">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton variant="text" width="200px" height={28} />
          <Skeleton variant="text" width="300px" />
        </div>
        <Skeleton variant="rectangular" width={100} height={36} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  )
}

export default Skeleton

