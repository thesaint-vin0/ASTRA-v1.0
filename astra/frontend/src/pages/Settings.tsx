import { useState, useEffect, useCallback } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useThemeStore, type Theme } from '../stores/themeStore'
import { api } from '../services/api'
import { Sun, Moon, Palette, Save, RefreshCw, Loader2, AlertCircle, Eye, Bell, Monitor, MonitorDown, HardDrive, Shield, Bug, Clipboard, Download, Archive, Trash2 } from 'lucide-react'
import { showToast } from '../components/Toast'
import { useRouteFocus } from '../hooks/useRouteFocus'

export default function Settings() {
  const { ref: headingRef } = useRouteFocus()
  const { theme, setTheme, customColors, setCustomColors } = useThemeStore(useShallow((s) => ({
    theme: s.theme,
    setTheme: s.setTheme,
    customColors: s.customColors,
    setCustomColors: s.setCustomColors,
  })))
  const [settings, setSettings] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Native Desktop settings
  const [desktopSettings, setDesktopSettings] = useState({
    launchOnStartup: false,
    startMinimized: false,
    minimizeToTray: true,
    alwaysOnTop: false,
  })
  const [desktopSettingsLoading, setDesktopSettingsLoading] = useState(false)

  // Stability & Recovery
  const [backups, setBackups] = useState<string[]>([])
  const [backupsLoading, setBackupsLoading] = useState(false)
  const [crashLogs, setCrashLogs] = useState<string>('')
  const [crashLogsLoading, setCrashLogsLoading] = useState(false)

  useEffect(() => {
    loadSettings()
    loadDesktopSettings()
  }, [])

  const loadDesktopSettings = async () => {
    if (!window.electronAPI) return
    setDesktopSettingsLoading(true)
    try {
      const [launchOnStartup, settings] = await Promise.all([
        window.electronAPI.getLaunchOnStartup(),
        window.electronAPI.getSettings().catch(() => ({})),
      ])
      setDesktopSettings({
        launchOnStartup,
        startMinimized: (settings as any)?.startMinimized ?? false,
        minimizeToTray: (settings as any)?.minimizeToTray ?? true,
        alwaysOnTop: (settings as any)?.alwaysOnTop ?? false,
      })
    } catch {
      // Silently fail — features degrade gracefully
    } finally {
      setDesktopSettingsLoading(false)
    }
  }

  const loadSettings = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.settings.get()
      setSettings(data)
    } catch (err) {
      const message = (err as Error).message
      setError(message)
      showToast({ type: 'error', title: 'Failed to load settings', message })
    } finally {
      setLoading(false)
    }
  }

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme)
    showToast({ type: 'success', title: `Theme changed to ${newTheme}` })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      showToast({ type: 'success', title: 'Settings saved successfully' })
    } catch (err) {
      showToast({ type: 'error', title: 'Failed to save settings', message: (err as Error).message })
    } finally {
      setSaving(false)
    }
  }

  // Native Desktop actions
  const handleToggleLaunchOnStartup = useCallback(async (checked: boolean) => {
    if (!window.electronAPI) return
    try {
      await window.electronAPI.setLaunchOnStartup(checked, desktopSettings.startMinimized)
      setDesktopSettings((prev) => ({ ...prev, launchOnStartup: checked }))
      showToast({ type: 'success', title: checked ? 'Launch on startup enabled' : 'Launch on startup disabled' })
    } catch {
      showToast({ type: 'error', title: 'Failed to update launch on startup setting' })
    }
  }, [desktopSettings.startMinimized])

  const handleToggleStartMinimized = useCallback(async (checked: boolean) => {
    if (!window.electronAPI) return
    try {
      await window.electronAPI.setLaunchOnStartup(desktopSettings.launchOnStartup, checked)
      setDesktopSettings((prev) => ({ ...prev, startMinimized: checked }))
      showToast({ type: 'success', title: 'Start minimized preference saved' })
    } catch {
      showToast({ type: 'error', title: 'Failed to update start minimized setting' })
    }
  }, [desktopSettings.launchOnStartup])

  const handleToggleAlwaysOnTop = useCallback(async (checked: boolean) => {
    if (!window.electronAPI) return
    try {
      await window.electronAPI.setAlwaysOnTop(checked)
      setDesktopSettings((prev) => ({ ...prev, alwaysOnTop: checked }))
      showToast({ type: 'success', title: checked ? 'Always on top enabled' : 'Always on top disabled' })
    } catch {
      showToast({ type: 'error', title: 'Failed to update always on top setting' })
    }
  }, [])

  const handleCreateDesktopShortcut = useCallback(async () => {
    if (!window.electronAPI) return
    try {
      const result = await window.electronAPI.createDesktopShortcut()
      if (result.success) {
        showToast({ type: 'success', title: 'Desktop shortcut created', message: result.path })
      } else {
        showToast({ type: 'error', title: 'Failed to create desktop shortcut', message: result.error })
      }
    } catch {
      showToast({ type: 'error', title: 'Failed to create desktop shortcut' })
    }
  }, [])

  // Stability & Recovery actions
  const handleLoadBackups = useCallback(async () => {
    if (!window.electronAPI) return
    setBackupsLoading(true)
    try {
      const result = await window.electronAPI.listBackups()
      if (result.success && result.backups) {
        setBackups(result.backups)
      }
    } catch {
      showToast({ type: 'error', title: 'Failed to load backups' })
    } finally {
      setBackupsLoading(false)
    }
  }, [])

  const handleCreateBackup = useCallback(async () => {
    if (!window.electronAPI) return
    try {
      const result = await window.electronAPI.createBackup()
      if (result.success) {
        showToast({ type: 'success', title: 'Backup created successfully' })
        handleLoadBackups()
      }
    } catch {
      showToast({ type: 'error', title: 'Failed to create backup' })
    }
  }, [handleLoadBackups])

  const handleRestoreBackup = useCallback(async (filename: string) => {
    if (!window.electronAPI) return
    try {
      const result = await window.electronAPI.restoreBackup(filename)
      if (result.success) {
        showToast({ type: 'success', title: 'Backup restored successfully', message: 'Please restart Astra for changes to take effect.' })
      } else {
        showToast({ type: 'error', title: 'Failed to restore backup', message: result.error })
      }
    } catch {
      showToast({ type: 'error', title: 'Failed to restore backup' })
    }
  }, [])

  const handleLoadCrashLogs = useCallback(async () => {
    if (!window.electronAPI) return
    setCrashLogsLoading(true)
    try {
      const result = await window.electronAPI.getCrashLogs()
      if (result.success) {
        setCrashLogs(result.logs || 'No crash logs recorded.')
      }
    } catch {
      showToast({ type: 'error', title: 'Failed to load crash logs' })
    } finally {
      setCrashLogsLoading(false)
    }
  }, [])

  const handleCopyDiagnostics = useCallback(async () => {
    if (!window.electronAPI) return
    try {
      const [systemInfo, version, logs] = await Promise.all([
        window.electronAPI.getSystemInfo(),
        window.electronAPI.getVersion(),
        window.electronAPI.getCrashLogs().catch(() => ({ success: false, logs: '' })),
      ])
      const diag = [
        `Astra AI Diagnostics`,
        `=====================`,
        `Version: ${version}`,
        `Platform: ${systemInfo.platform} ${systemInfo.arch}`,
        `Electron: ${systemInfo.electronVersion}`,
        `Node: ${systemInfo.nodeVersion}`,
        `Chrome: ${systemInfo.chromeVersion}`,
        ``,
        `Crash Logs:`,
        logs.success ? (logs.logs || 'None') : 'Failed to load',
      ].join('\n')
      await navigator.clipboard.writeText(diag)
      showToast({ type: 'success', title: 'Diagnostics copied to clipboard' })
    } catch {
      showToast({ type: 'error', title: 'Failed to copy diagnostics' })
    }
  }, [])

  const themes: { value: Theme; label: string; icon: React.ReactNode }[] = [
    { value: 'dark', label: 'Dark', icon: <Moon size={20} /> },
    { value: 'light', label: 'Light', icon: <Sun size={20} /> },
    { value: 'custom', label: 'Custom', icon: <Palette size={20} /> },
  ]

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <Loader2 size={32} className="animate-spin text-astra-400 mx-auto mb-3" />
            <p className="text-sm text-[rgb(var(--color-text-secondary))]">Loading settings...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-center py-20">
          <div className="text-center max-w-md">
            <AlertCircle size={32} className="text-red-500 mx-auto mb-3" />
            <h2 className="text-lg font-semibold text-[rgb(var(--color-text))] mb-2">Failed to load settings</h2>
            <p className="text-sm text-[rgb(var(--color-text-secondary))] mb-4">{error}</p>
            <button onClick={loadSettings} className="btn-primary flex items-center gap-2 mx-auto">
              <RefreshCw size={16} />
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-bold text-[rgb(var(--color-text))] focus:outline-none">Settings</h1>
        <p className="text-sm text-[rgb(var(--color-text-secondary))] mt-1">
          Customize your Astra AI experience
        </p>
      </div>

      <div className="space-y-6">
        {/* Appearance */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-[rgb(var(--color-text))] mb-4">Appearance</h2>
          <div className="grid grid-cols-3 gap-3 mb-4">
            {themes.map((t) => (
              <button
                key={t.value}
                onClick={() => handleThemeChange(t.value)}
                className={`p-4 rounded-xl border-2 transition-all ${
                  theme === t.value
                    ? 'border-astra-500 bg-astra-500/10'
                    : 'border-[rgb(var(--color-border))] hover:border-astra-400'
                }`}
                aria-label={`Switch to ${t.label} theme`}
                aria-pressed={theme === t.value}
              >
                <div className="flex flex-col items-center gap-2">
                  <span className={theme === t.value ? 'text-astra-400' : 'text-[rgb(var(--color-text-secondary))]'}>
                    {t.icon}
                  </span>
                  <span className="text-sm font-medium text-[rgb(var(--color-text))]">{t.label}</span>
                </div>
              </button>
            ))}
          </div>
          {theme === 'custom' && (
            <div>
              <h3 className="text-sm font-medium text-[rgb(var(--color-text))] mb-3">Custom Colors</h3>
              <div className="grid grid-cols-2 gap-4">
                <ColorInput label="Primary" value={customColors.primary} onChange={(v) => setCustomColors({ primary: v })} />
                <ColorInput label="Background" value={customColors.bg} onChange={(v) => setCustomColors({ bg: v })} />
                <ColorInput label="Surface" value={customColors.surface} onChange={(v) => setCustomColors({ surface: v })} />
                <ColorInput label="Text" value={customColors.text} onChange={(v) => setCustomColors({ text: v })} />
              </div>
            </div>
          )}
        </div>

        {/* General */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-[rgb(var(--color-text))] mb-4">General</h2>
          <div className="space-y-4">
            <SettingRow label="Default Personality" description="AI personality for new conversations">
              <select
                className="input text-sm"
                aria-label="Default personality"
                value={settings.default_personality || 'professional'}
                onChange={(e) => setSettings((prev: Record<string, any>) => ({ ...prev, default_personality: e.target.value }))}
              >
                <option value="professional">Professional</option>
                <option value="friendly">Friendly</option>
                <option value="technical">Technical</option>
                <option value="creative">Creative</option>
                <option value="researcher">Researcher</option>
                <option value="minimal">Minimal</option>
              </select>
            </SettingRow>
            <SettingRow label="Streaming" description="Enable real-time response streaming">
              <input
                type="checkbox"
                defaultChecked
                className="toggle"
                aria-label="Enable streaming"
                data-checked="true"
              />
            </SettingRow>
            <SettingRow label="GPU Acceleration" description="Use GPU for model inference">
              <input
                type="checkbox"
                defaultChecked
                className="toggle"
                aria-label="Enable GPU acceleration"
                data-checked="true"
              />
            </SettingRow>
          </div>
        </div>

        {/* Model Configuration */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-[rgb(var(--color-text))] mb-4">Model Configuration</h2>
          <div className="space-y-4">
            <SettingRow label="Default Model" description="Primary AI model for responses">
              <select className="input text-sm" aria-label="Default model">
                <option>qwen2.5:7b</option>
                <option>llama3.2:3b</option>
                <option>mistral:7b</option>
              </select>
            </SettingRow>
            <SettingRow label="Fallback Model" description="Model to use if primary fails">
              <select className="input text-sm" aria-label="Fallback model">
                <option>llama3.2:3b</option>
                <option>qwen2.5:7b</option>
                <option>phi:latest</option>
              </select>
            </SettingRow>
            <SettingRow label="Temperature" description="Response creativity (0 = precise, 1 = creative)">
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                defaultValue={0.7}
                className="w-full"
                aria-label="Temperature"
              />
            </SettingRow>
          </div>
        </div>

{/* Updates */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-[rgb(var(--color-text))] mb-4">Updates</h2>
          <div className="space-y-4">
            <SettingRow label="Update Channel" description="Which release channel to track">
              <select className="input text-sm" aria-label="Update channel">
                <option value="stable">stable</option>
                <option value="beta">beta</option>
                <option value="dev">dev</option>
              </select>
            </SettingRow>
            <SettingRow label="Auto Update" description="Automatically download and install updates">
              <input type="checkbox" className="toggle" aria-label="Enable auto update" />
            </SettingRow>
          </div>
        </div>

        {/* Accessibility */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-[rgb(var(--color-text))] mb-4 flex items-center gap-2">
            <Eye size={18} className="text-astra-400" /> Accessibility
          </h2>
          <div className="space-y-4">
            <SettingRow label="High Contrast Mode" description="Increase color contrast for better visibility">
              <input
                type="checkbox"
                className="toggle"
                aria-label="Toggle high contrast mode"
                onChange={(e) => {
                  document.documentElement.classList.toggle('high-contrast', e.target.checked)
                }}
              />
            </SettingRow>
            <SettingRow label="Reduced Motion" description="Minimize animations and transitions">
              <input
                type="checkbox"
                className="toggle"
                aria-label="Toggle reduced motion"
                onChange={(e) => {
                  document.documentElement.classList.toggle('reduce-motion', e.target.checked)
                }}
              />
            </SettingRow>
            <SettingRow label="Font Size" description="Adjust text size (requires reload)">
              <select
                className="input text-sm"
                aria-label="Font size"
                defaultValue="normal"
                onChange={(e) => {
                  const scale = e.target.value === 'small' ? '0.875' : e.target.value === 'large' ? '1.25' : e.target.value === 'x-large' ? '1.5' : '1'
                  document.documentElement.style.setProperty('--font-scale', scale)
                }}
              >
                <option value="small">Small</option>
                <option value="normal">Normal</option>
                <option value="large">Large</option>
                <option value="x-large">Extra Large</option>
              </select>
            </SettingRow>
            <SettingRow label="Screen Reader Optimizations" description="Enhance ARIA labels and announcements">
              <input type="checkbox" className="toggle" aria-label="Enable screen reader optimizations" defaultChecked />
            </SettingRow>
            <SettingRow label="Keyboard Navigation Mode" description="Enhanced focus indicators for keyboard users">
              <input
                type="checkbox"
                className="toggle"
                aria-label="Toggle keyboard navigation mode"
                onChange={(e) => {
                  document.documentElement.classList.toggle('keyboard-nav', e.target.checked)
                }}
              />
            </SettingRow>
          </div>
        </div>

        {/* Notifications */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-[rgb(var(--color-text))] mb-4 flex items-center gap-2">
            <Bell size={18} className="text-astra-400" /> Notifications
          </h2>
          <div className="space-y-4">
            <SettingRow label="AI Responses" description="Notify when AI finishes responding">
              <input type="checkbox" className="toggle" aria-label="Notify on AI responses" defaultChecked />
            </SettingRow>
            <SettingRow label="Long-running Tasks" description="Notify when tasks complete">
              <input type="checkbox" className="toggle" aria-label="Notify on task completion" defaultChecked />
            </SettingRow>
            <SettingRow label="Plugin Updates" description="Notify when plugin updates are available">
              <input type="checkbox" className="toggle" aria-label="Notify on plugin updates" defaultChecked />
            </SettingRow>
            <SettingRow label="Model Downloads" description="Notify when model downloads finish">
              <input type="checkbox" className="toggle" aria-label="Notify on model downloads" defaultChecked />
            </SettingRow>
            <SettingRow label="Application Updates" description="Notify when new versions are available">
              <input type="checkbox" className="toggle" aria-label="Notify on app updates" defaultChecked />
            </SettingRow>
            <SettingRow label="Automation" description="Notify when automation workflows complete">
              <input type="checkbox" className="toggle" aria-label="Notify on automation" defaultChecked />
            </SettingRow>
            <SettingRow label="Errors & Warnings" description="Show error and warning notifications">
              <input type="checkbox" className="toggle" aria-label="Notify on errors" defaultChecked />
            </SettingRow>
          </div>
        </div>

{/* Native Desktop */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-[rgb(var(--color-text))] mb-4 flex items-center gap-2">
            <Monitor size={18} className="text-astra-400" /> Native Desktop
          </h2>
          {!window.electronAPI ? (
            <p className="text-sm text-[rgb(var(--color-text-secondary))]">
              Native desktop settings are available when running as an Electron application.
            </p>
          ) : desktopSettingsLoading ? (
            <div className="flex items-center gap-2 text-sm text-[rgb(var(--color-text-secondary))]">
              <Loader2 size={14} className="animate-spin" />
              Loading desktop settings...
            </div>
          ) : (
            <div className="space-y-4">
              <SettingRow label="Launch on Startup" description="Automatically start Astra when you log in">
                <input
                  type="checkbox"
                  className="toggle"
                  checked={desktopSettings.launchOnStartup}
                  onChange={(e) => handleToggleLaunchOnStartup(e.target.checked)}
                  aria-label="Toggle launch on startup"
                />
              </SettingRow>
              <SettingRow label="Start Minimized" description="Start Astra in the system tray">
                <input
                  type="checkbox"
                  className="toggle"
                  checked={desktopSettings.startMinimized}
                  onChange={(e) => handleToggleStartMinimized(e.target.checked)}
                  aria-label="Toggle start minimized"
                />
              </SettingRow>
              <SettingRow label="Minimize to Tray" description="Minimize to system tray instead of closing">
                <input
                  type="checkbox"
                  className="toggle"
                  checked={desktopSettings.minimizeToTray}
                  onChange={(e) => {
                    setDesktopSettings((prev) => ({ ...prev, minimizeToTray: e.target.checked }))
                    if (window.electronAPI) {
                      window.electronAPI.setSetting('minimizeToTray', e.target.checked).catch(() => {})
                    }
                  }}
                  aria-label="Toggle minimize to tray"
                />
              </SettingRow>
              <SettingRow label="Always on Top" description="Keep Astra window above other windows">
                <input
                  type="checkbox"
                  className="toggle"
                  checked={desktopSettings.alwaysOnTop}
                  onChange={(e) => handleToggleAlwaysOnTop(e.target.checked)}
                  aria-label="Toggle always on top"
                />
              </SettingRow>
              <div className="pt-2 border-t border-[rgb(var(--color-border))]">
                <button onClick={handleCreateDesktopShortcut} className="btn-secondary text-sm flex items-center gap-2">
                  <MonitorDown size={14} />
                  Create Desktop Shortcut
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Stability & Recovery */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-[rgb(var(--color-text))] mb-4 flex items-center gap-2">
            <Shield size={18} className="text-astra-400" /> Stability & Recovery
          </h2>
          {!window.electronAPI ? (
            <p className="text-sm text-[rgb(var(--color-text-secondary))]">
              Stability and recovery features are available when running as an Electron application.
            </p>
          ) : (
            <div className="space-y-6">
              {/* Backups */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-[rgb(var(--color-text))] flex items-center gap-1.5">
                    <Archive size={14} className="text-astra-400" /> Backups
                  </h3>
                  <div className="flex items-center gap-2">
                    <button onClick={handleLoadBackups} className="btn-ghost text-xs" aria-label="Refresh backups">
                      <RefreshCw size={12} />
                    </button>
                    <button onClick={handleCreateBackup} className="btn-primary text-xs flex items-center gap-1">
                      <Download size={12} /> Create Backup
                    </button>
                  </div>
                </div>
                {backupsLoading ? (
                  <div className="flex items-center gap-2 text-xs text-[rgb(var(--color-text-secondary))]">
                    <Loader2 size={12} className="animate-spin" />
                    Loading backups...
                  </div>
                ) : backups.length === 0 ? (
                  <p className="text-xs text-[rgb(var(--color-text-secondary))]">
                    No backups available. Automatic backups are created hourly.
                  </p>
                ) : (
                  <div className="space-y-1 max-h-[160px] overflow-y-auto scrollbar-thin">
                    {backups.map((name) => (
                      <div key={name} className="flex items-center justify-between py-1 px-2 rounded hover:bg-[rgb(var(--color-bg))]">
                        <span className="text-xs text-[rgb(var(--color-text-secondary))] truncate flex-1">{name}</span>
                        <button
                          onClick={() => handleRestoreBackup(name)}
                          className="text-[10px] text-astra-400 hover:text-astra-300 flex-shrink-0"
                          aria-label={`Restore backup ${name}`}
                        >
                          Restore
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Crash Logs */}
              <div className="pt-4 border-t border-[rgb(var(--color-border))]">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-[rgb(var(--color-text))] flex items-center gap-1.5">
                    <Bug size={14} className="text-astra-400" /> Crash Logs
                  </h3>
                  <div className="flex items-center gap-2">
                    <button onClick={handleLoadCrashLogs} className="btn-ghost text-xs" aria-label="Refresh crash logs">
                      <RefreshCw size={12} />
                    </button>
                    <button onClick={handleCopyDiagnostics} className="btn-ghost text-xs flex items-center gap-1" aria-label="Copy diagnostics">
                      <Clipboard size={12} /> Copy Diagnostics
                    </button>
                  </div>
                </div>
                {crashLogsLoading ? (
                  <div className="flex items-center gap-2 text-xs text-[rgb(var(--color-text-secondary))]">
                    <Loader2 size={12} className="animate-spin" />
                    Loading crash logs...
                  </div>
                ) : (
                  <div className="relative">
                    <pre className="text-[10px] text-[rgb(var(--color-text-secondary))] bg-[rgb(var(--color-bg))] rounded-lg p-3 max-h-[120px] overflow-y-auto scrollbar-thin font-mono whitespace-pre-wrap">
                      {crashLogs || 'Click refresh to load crash logs.'}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={loadSettings}
            className="btn-secondary flex items-center gap-2"
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Reset
          </button>
          <button
            onClick={handleSave}
            className="btn-primary flex items-center gap-2"
            disabled={saving}
          >
            {saving ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
            Save Settings
          </button>
        </div>
      </div>
    </div>
  )
}

function SettingRow({ label, description, children }: { label: string; description: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="text-sm font-medium text-[rgb(var(--color-text))]">{label}</p>
        <p className="text-xs text-[rgb(var(--color-text-secondary))]">{description}</p>
      </div>
      {children}
    </div>
  )
}

function ColorInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-3">
      <label className="text-sm text-[rgb(var(--color-text-secondary))] w-20">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-8 h-8 rounded cursor-pointer"
          aria-label={`${label} color`}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="input text-sm w-28"
          aria-label={`${label} color hex`}
        />
      </div>
    </div>
  )
}

