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
  BookOpen,
  HelpCircle,
  GraduationCap,
  Wrench,
  ChevronLeft,
  Sparkles,
} from 'lucide-react'
import { useState } from 'react'

const mainNavItems: Array<{ view: SidebarView; label: string; icon: React.ReactNode; path: string }> = [
  { view: 'chat', label: 'Chat', icon: <MessageSquare size={18} />, path: '/chat' },
  { view: 'memory', label: 'Memory', icon: <Brain size={18} />, path: '/memory' },
  { view: 'models', label: 'Models', icon: <Cpu size={18} />, path: '/models' },
  { view: 'files', label: 'Files', icon: <FolderOpen size={18} />, path: '/files' },
  { view: 'plugins', label: 'Plugins', icon: <Puzzle size={18} />, path: '/plugins' },
  { view: 'settings', label: 'Settings', icon: <Settings size={18} />, path: '/settings' },
]

const learnNavItems: Array<{ view: string; label: string; icon: React.ReactNode; path: string }> = [
  { view: 'how-it-works', label: 'How Astra Works', icon: <Sparkles size={18} />, path: '/how-it-works' },
  { view: 'tutorials', label: 'Tutorials', icon: <GraduationCap size={18} />, path: '/tutorials' },
  { view: 'help', label: 'Help Center', icon: <HelpCircle size={18} />, path: '/help' },
]

interface SidebarProps {
  onCollapse?: () => void
}

export default function Sidebar({ onCollapse }: SidebarProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { setSidebarView, sidebarOpen, setSidebarOpen } = useAppStore()
  const [collapsed, setCollapsed] = useState(false)

  const isActive = (path: string) => {
    if (path === '/dashboard') return location.pathname === '/dashboard'
    return location.pathname.startsWith(path)
  }

  const handleNavigate = (view: SidebarView, path: string) => {
    setSidebarView(view)
    navigate(path)
  }

  const toggleCollapsed = () => {
    setCollapsed(!collapsed)
    onCollapse?.()
  }

  if (!sidebarOpen) return null

  return (
    <aside
      className={`${
        collapsed ? 'w-14' : 'w-56'
      } bg-[rgb(var(--color-surface))] border-r border-[rgb(var(--color-border))] flex flex-col overflow-hidden transition-all duration-300 ease-in-out`}
    >
      {/* Collapse toggle */}
      <div className={`p-2 flex ${collapsed ? 'justify-center' : 'justify-between items-center'}`}>
        {!collapsed && (
          <button
            onClick={() => navigate('/dashboard')}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 flex-1 ${
              isActive('/dashboard')
                ? 'bg-astra-600 text-white'
                : 'text-[rgb(var(--color-text-secondary))] hover:bg-[rgb(var(--color-bg))] hover:text-[rgb(var(--color-text))]'
            }`}
          >
            <LayoutDashboard size={18} />
            <span className="text-sm font-medium">Dashboard</span>
          </button>
        )}
        <button
          onClick={toggleCollapsed}
          className="btn-icon text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-text))]"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <ChevronLeft
            size={16}
            className={`transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {!collapsed && (
          <div className="px-3 mb-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[rgb(var(--color-text-secondary))]">
              Navigation
            </p>
          </div>
        )}
        <nav className={`px-2 space-y-0.5 ${collapsed ? 'flex flex-col items-center' : ''}`}>
          {mainNavItems.map((item) => (
            <button
              key={item.view}
              onClick={() => handleNavigate(item.view, item.path)}
              className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg transition-all duration-200 ${
                collapsed ? 'justify-center px-0' : ''
              } ${
                isActive(item.path)
                  ? 'bg-astra-600 text-white'
                  : 'text-[rgb(var(--color-text-secondary))] hover:bg-[rgb(var(--color-bg))] hover:text-[rgb(var(--color-text))]'
              }`}
              title={collapsed ? item.label : undefined}
            >
              {item.icon}
              {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* Learning & Documentation */}
        <div className="mt-4">
          {!collapsed && (
            <div className="px-3 mb-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[rgb(var(--color-text-secondary))]">
                Learn
              </p>
            </div>
          )}
          <nav className={`px-2 space-y-0.5 ${collapsed ? 'flex flex-col items-center' : ''}`}>
            {learnNavItems.map((item) => (
              <button
                key={item.view}
                onClick={() => navigate(item.path)}
                className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg transition-all duration-200 ${
                  collapsed ? 'justify-center px-0' : ''
                } ${
                  isActive(item.path)
                    ? 'bg-astra-600 text-white'
                    : 'text-[rgb(var(--color-text-secondary))] hover:bg-[rgb(var(--color-bg))] hover:text-[rgb(var(--color-text))]'
                }`}
                title={collapsed ? item.label : undefined}
              >
                {item.icon}
                {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
              </button>
            ))}
          </nav>
        </div>

        {/* Developer Tools */}
        <div className="mt-4">
          {!collapsed && (
            <div className="px-3 mb-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[rgb(var(--color-text-secondary))]">
                Developer
              </p>
            </div>
          )}
          <nav className={`px-2 space-y-0.5 ${collapsed ? 'flex flex-col items-center' : ''}`}>
            <button
              onClick={() => navigate('/devtools')}
              className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg transition-all duration-200 ${
                collapsed ? 'justify-center px-0' : ''
              } ${
                isActive('/devtools')
                  ? 'bg-astra-600 text-white'
                  : 'text-[rgb(var(--color-text-secondary))] hover:bg-[rgb(var(--color-bg))] hover:text-[rgb(var(--color-text))]'
              }`}
              title={collapsed ? 'Developer Tools' : undefined}
            >
              <Wrench size={18} />
              {!collapsed && <span className="text-sm font-medium">Developer Tools</span>}
            </button>
          </nav>
        </div>
      </div>

      {/* Version */}
      {!collapsed && (
        <div className="p-3 border-t border-[rgb(var(--color-border))]">
          <p className="text-xs text-[rgb(var(--color-text-secondary))]">
            Astra AI v0.1.0
          </p>
          <div className="flex items-center gap-1 mt-1">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
            <span className="text-[10px] text-[rgb(var(--color-text-secondary))]">All systems operational</span>
          </div>
        </div>
      )}
    </aside>
  )
}

