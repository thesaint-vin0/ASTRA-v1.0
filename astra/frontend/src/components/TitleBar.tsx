import { useEffect, useState } from 'react'
import { useAppStore } from '../stores/appStore'
import { Menu, Minus, Maximize2, Minimize2, X } from 'lucide-react'

export default function TitleBar() {
  const { sidebarOpen, toggleSidebar, isConnected } = useAppStore()
  const isElectron = !!(window as any).electronAPI
  const [isMaximized, setIsMaximized] = useState(false)
  const [appVersion, setAppVersion] = useState('0.1.0')

  useEffect(() => {
    if (isElectron) {
      const api = (window as any).electronAPI
      api.isMaximized().then(setIsMaximized)

      const unsub = api.onMaximizeChange((maximized: boolean) => {
        setIsMaximized(maximized)
      })

      api.getVersion().then(setAppVersion)

      return () => unsub()
    }
  }, [isElectron])

  const handleMinimize = () => (window as any).electronAPI?.minimize()
  const handleMaximize = () => (window as any).electronAPI?.maximize()
  const handleClose = () => (window as any).electronAPI?.close()

  return (
    <div
      className={`flex items-center justify-between h-10 px-3 bg-[rgb(var(--color-surface))] border-b border-[rgb(var(--color-border))] select-none ${
        isElectron ? 'app-region-drag' : ''
      }`}
    >
      {/* Left section */}
      <div className="flex items-center gap-3">
        {!isElectron && (
          <button
            onClick={toggleSidebar}
            className="btn-icon"
            title="Toggle sidebar"
          >
            <Menu size={16} />
          </button>
        )}

        <div className="flex items-center gap-2">
          {/* Connection indicator */}
          <div
            className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-green-500' : 'bg-red-500'
            } transition-colors duration-300`}
            title={isConnected ? 'Connected' : 'Disconnected'}
          />
          <span className="text-sm font-semibold text-[rgb(var(--color-text))]">
            Astra AI
          </span>
          <span className="text-[10px] text-[rgb(var(--color-text-secondary))] font-mono">
            v{appVersion}
          </span>
        </div>
      </div>

      {/* Center - Window title */}
      <div className="absolute left-1/2 -translate-x-1/2 text-xs text-[rgb(var(--color-text-secondary))] app-region-drag">
        {/* macOS traffic light spacing */}
      </div>

      {/* Right section - Window controls */}
      {isElectron && (
        <div className="flex items-center app-region-no-drag">
          <button
            onClick={handleMinimize}
            className="btn-icon hover:bg-[rgb(var(--color-bg))] group"
            title="Minimize"
          >
            <Minus size={14} className="group-hover:scale-110 transition-transform" />
          </button>
          <button
            onClick={handleMaximize}
            className="btn-icon hover:bg-[rgb(var(--color-bg))] group"
            title={isMaximized ? 'Restore' : 'Maximize'}
          >
            {isMaximized ? (
              <Minimize2 size={14} className="group-hover:scale-110 transition-transform" />
            ) : (
              <Maximize2 size={14} className="group-hover:scale-110 transition-transform" />
            )}
          </button>
          <button
            onClick={handleClose}
            className="btn-icon hover:bg-red-500/20 hover:text-red-500 group"
            title="Close"
          >
            <X size={14} className="group-hover:scale-110 transition-transform" />
          </button>
        </div>
      )}
    </div>
  )
}

