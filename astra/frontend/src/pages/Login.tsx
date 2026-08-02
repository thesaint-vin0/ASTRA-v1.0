import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bot } from 'lucide-react'
import { useRouteFocus } from '../hooks/useRouteFocus'

export default function Login() {
  const { ref: headingRef } = useRouteFocus()
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // For now, just navigate to dashboard
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[rgb(var(--color-bg))] p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-astra-600/20 flex items-center justify-center mx-auto mb-4">
            <Bot size={32} className="text-astra-400" />
          </div>
          <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-bold text-[rgb(var(--color-text))] focus:outline-none">Astra AI</h1>
          <p className="text-sm text-[rgb(var(--color-text-secondary))] mt-1">
            {isLogin ? 'Welcome back' : 'Create your account'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-500">
              {error}
            </div>
          )}

          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-[rgb(var(--color-text))] mb-1">
                Username
              </label>
              <input
                type="text"
                required
                className="input"
                placeholder="Your username"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-[rgb(var(--color-text))] mb-1">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[rgb(var(--color-text))] mb-1">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              placeholder="Your password"
            />
          </div>

          <button type="submit" className="btn-primary w-full">
            {isLogin ? 'Sign In' : 'Create Account'}
          </button>

          <p className="text-center text-sm text-[rgb(var(--color-text-secondary))]">
            {isLogin ? (
              <>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => setIsLogin(false)}
                  className="text-astra-400 hover:text-astra-300 font-medium"
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => setIsLogin(true)}
                  className="text-astra-400 hover:text-astra-300 font-medium"
                >
                  Sign in
                </button>
              </>
            )}
          </p>
        </form>
      </div>
    </div>
  )
}

