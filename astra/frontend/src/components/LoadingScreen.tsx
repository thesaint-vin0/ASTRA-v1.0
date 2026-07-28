import { motion } from 'framer-motion'
import { Bot } from 'lucide-react'

interface LoadingScreenProps {
  message?: string
  fullScreen?: boolean
}

export default function LoadingScreen({
  message = 'Loading...',
  fullScreen = false,
}: LoadingScreenProps) {
  const content = (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="relative">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-astra-500 to-astra-700 flex items-center justify-center shadow-lg shadow-astra-500/20">
          <Bot size={32} className="text-white animate-pulse" />
        </div>
        <motion.div
          className="absolute -inset-1 rounded-2xl border-2 border-astra-500/20"
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        />
      </div>
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-astra-500 animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-2 h-2 rounded-full bg-astra-500 animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-2 h-2 rounded-full bg-astra-500 animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <p className="text-sm text-[rgb(var(--color-text-secondary))] font-mono">{message}</p>
    </div>
  )

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgb(var(--color-bg))]/80 backdrop-blur-sm">
        {content}
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center py-20">
      {content}
    </div>
  )
}

