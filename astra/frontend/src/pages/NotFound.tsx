import { useNavigate } from 'react-router-dom'
import { Home, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex items-center justify-center bg-[rgb(var(--color-bg))] p-4">
      <div className="text-center max-w-md">
        <div className="text-6xl font-bold text-astra-500 mb-4">404</div>
        <h1 className="text-2xl font-bold text-[rgb(var(--color-text))] mb-2">Page Not Found</h1>
        <p className="text-sm text-[rgb(var(--color-text-secondary))] mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button onClick={() => navigate(-1)} className="btn-secondary flex items-center gap-2">
            <ArrowLeft size={16} />
            Go Back
          </button>
          <button onClick={() => navigate('/dashboard')} className="btn-primary flex items-center gap-2">
            <Home size={16} />
            Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}

