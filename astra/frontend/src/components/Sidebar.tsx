import { useNavigate, useLocation } from 'react-router-dom'
import { useAppStore, type SidebarView } from '../stores/appStore'
import {
  MessageSquare,
  Brain,
  Cpu,
  FolderOpen,
  Puzzle,
  Settings,
  LayoutDashboard,
} from 'lucide-react'

const navItems: Array<{ view: SidebarView; label: string; icon: React.ReactNode; path: string }> = [
  { view: 'chat', label: 'Chat', icon: <MessageSquare size={18} />, path: '/chat' },
  { view: 'memory', label: 'Memory', icon: <Brain size={18} />, path: '/memory' },
  { view: 'models', label: 'Models', icon: <Cpu size={18} />, path: '/models' },
  { view: 'files', label: 'Files', icon: <FolderOpen size={18} />, path: '/files' },
  { view: 'plugins', label: 'Plugins', icon: <Puzzle size={18} />, path: '/plugins' },
  { view: 'settings', label: 'Settings', icon: <Settings size={18} />, path: '/settings' },
]

export default function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { setSidebarView } = useAppStore()

  const handleNavigate = (view: SidebarView, path: string) => {
    setSidebarView(view)
    navigate(path)
  }

  return (
    <aside className="w-56 bg-[rgb(var(--color-surface))] border-r border-[rgb(var(--color-border))] flex flex-col overflow-hidden">
      {/* Dashboard button */}
      <div className="p-2">
        <button
          onClick={() => navigate('/dashboard')}
          className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg transition-all duration-200 ${
            location.pathname === '/dashboard'
              ? 'bg-astra-600 text-white'
              : 'text-[rgb(var(--color-text-secondary))] hover:bg-[rgb(var(--color-bg))] hover:text-[rgb(var(--color-text))]'
          }`}
        >
          <LayoutDashboard size={18} />
          <span className="text-sm font-medium">Dashboard</span>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto scrollbar-thin">
        {navItems.map((item) => (
          <button
            key={item.view}
            onClick={() => handleNavigate(item.view, item.path)}
            className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg transition-all duration-200 ${
              location.pathname.startsWith(item.path)
                ? 'bg-astra-600 text-white'
                : 'text-[rgb(var(--color-text-secondary))] hover:bg-[rgb(var(--color-bg))] hover:text-[rgb(var(--color-text))]'
            }`}
          >
            {item.icon}
            <span className="text-sm font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Version */}
      <div className="p-3 border-t border-[rgb(var(--color-border))]">
        <p className="text-xs text-[rgb(var(--color-text-secondary))]">Astra AI v0.1.0</p>
      </div>
    </aside>
  )
}

