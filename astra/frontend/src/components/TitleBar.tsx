import { useAppStore } from '../stores/appStore'
import { Menu, X, Minus, Maximize2, Minimize2 } from 'lucide-react'

export default function TitleBar() {
  const { sidebarOpen, toggleSidebar, isConnected } = useAppStore()
  const isElectron = !!(window as any).electronAPI

  const handleMinimize = () => (window as any).electronAPI?.minimize()
  const handleMaximize = () => (window as any).electronAPI?.maximize()
  const handleClose = () => (window as any).electronAPI?.close()

  return (
    <div
      className={`flex items-center justify-between h-10 px-3 bg-[rgb(var(--color-surface))] border-b border-[rgb(var(--color-border))] select-none ${
        isElectron ? 'app-region-drag' : ''
      }`}
    >
      <div className="flex items-center gap-2">
        {!isElectron && (
          <button onClick={toggleSidebar} className="btn-ghost p-1">
            {sidebarOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        )}
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm font-semibold text-[rgb(var(--color-text))]">Astra AI</span>
        </div>
      </div>

      {isElectron && (
        <div className="flex items-center app-region-no-drag">
          <button onClick={handleMinimize} className="btn-ghost p-1.5 hover:bg-[rgb(var(--color-bg))]">
            <Minus size={14} />
          </button>
          <button onClick={handleMaximize} className="btn-ghost p-1.5 hover:bg-[rgb(var(--color-bg))]">
            <Maximize2 size={14} />
          </button>
          <button onClick={handleClose} className="btn-ghost p-1.5 hover:bg-red-500/20 hover:text-red-500">
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  )
}

