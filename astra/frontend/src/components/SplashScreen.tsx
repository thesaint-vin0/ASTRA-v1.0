import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bot } from 'lucide-react'

interface SplashScreenProps {
  onComplete: () => void
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState('Initializing...')
  const [fadeOut, setFadeOut] = useState(false)

  useEffect(() => {
    const steps = [
      { at: 15, text: 'Loading core modules...' },
      { at: 30, text: 'Connecting to AI engine...' },
      { at: 45, text: 'Initializing memory systems...' },
      { at: 60, text: 'Loading personalities...' },
      { at: 75, text: 'Preparing interface...' },
      { at: 90, text: 'Finalizing startup...' },
      { at: 100, text: 'Ready!' },
    ]

    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = Math.min(prev + Math.random() * 3 + 1, 100)
        const step = steps.filter((s) => next >= s.at).pop()
        if (step) setStatus(step.text)
        return next
      })
    }, 80)

    const timer = setTimeout(() => {
      clearInterval(interval)
      setProgress(100)
      setStatus('Ready!')
      setTimeout(() => {
        setFadeOut(true)
        setTimeout(onComplete, 600)
      }, 400)
    }, 2500)

    return () => {
      clearInterval(interval)
      clearTimeout(timer)
    }
  }, [onComplete])

  return (
    <AnimatePresence>
      {!fadeOut && (
        <motion.div
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[rgb(var(--color-bg))]"
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="flex flex-col items-center"
          >
            {/* Logo */}
            <div className="relative mb-8">
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-astra-500 to-astra-700 flex items-center justify-center shadow-2xl shadow-astra-500/25">
                <Bot size={48} className="text-white" />
              </div>
              <motion.div
                className="absolute -inset-2 rounded-3xl border-2 border-astra-500/30"
                animate={{ rotate: 360 }}
                transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
              />
            </div>

            {/* Title */}
            <h1 className="text-4xl font-bold text-[rgb(var(--color-text))] mb-2 tracking-tight">
              Astra AI
            </h1>
            <p className="text-sm text-[rgb(var(--color-text-secondary))] mb-10">
              Your Personal AI Operating System
            </p>

            {/* Progress Bar */}
            <div className="w-72">
              <div className="h-1.5 bg-[rgb(var(--color-surface))] rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-astra-500 to-astra-400 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <p className="text-xs text-[rgb(var(--color-text-secondary))] text-center mt-3 font-mono">
                {status}
              </p>
              <p className="text-[10px] text-[rgb(var(--color-text-secondary))] text-center mt-1 opacity-60">
                v0.1.0
              </p>
            </div>
          </motion.div>

          {/* Decorative background */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-astra-500/5 rounded-full blur-3xl" />
            <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-astra-600/5 rounded-full blur-3xl" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

