import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Bot, Loader2 } from 'lucide-react'
import { useAppStore } from '../stores/appStore'
import { showToast } from '../components/Toast'

export default function Login() {
  const navigate = useNavigate()
  const { setConnected } = useAppStore()
  const [loading, setLoading] = useState(false)

  const handleQuickStart = useCallback(async () => {
    setLoading(true)
    try {
      // Simulate connection check
      const res = await fetch('/api/health')
      if (res.ok) {
        setConnected(true)
        showToast({ type: 'success', title: 'Connected to Astra backend' })
        navigate('/dashboard')
      }
    } catch {
      showToast({ type: 'warning', title: 'Backend not reachable', message: 'Using offline mode. Some features may be unavailable.' })
      navigate('/dashboard')
    } finally {
      setLoading(false)
    }
  }, [navigate, setConnected])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[rgb(var(--color-bg))] p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-sm"
      >
        <div className="card p-8 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.2 }}
            className="w-16 h-16 rounded-2xl bg-gradient-to-br from-astra-500 to-astra-600 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-astra-500/30"
          >
            <Bot size={32} className="text-white" />
          </motion.div>

          <h1 className="text-2xl font-bold text-[rgb(var(--color-text))] mb-2">Astra AI</h1>
          <p className="text-sm text-[rgb(var(--color-text-secondary))] mb-6">
            Your personal AI operating system
          </p>

          <button
            onClick={handleQuickStart}
            disabled={loading}
            className="btn-primary w-full py-3 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Connecting...
              </>
            ) : (
              'Get Started'
            )}
          </button>

          <p className="text-xs text-[rgb(var(--color-text-secondary))] mt-4">
            By continuing, you agree to process data locally on your device.
          </p>
        </div>

        <p className="text-xs text-[rgb(var(--color-text-secondary))] text-center mt-4">
          Astra AI v0.1.0 — Local-First AI Operating System
        </p>
      </motion.div>
    </div>
  )
}
