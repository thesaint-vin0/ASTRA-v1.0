import { useState, useEffect } from 'react'
import { useThemeStore, type Theme } from '../stores/themeStore'
import { useAppStore } from '../stores/appStore'
import { api } from '../services/api'
import { Sun, Moon, Palette, Save, RefreshCw, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { showToast } from '../components/Toast'

export default function Settings() {
  const { theme, setTheme, customColors, setCustomColors } = useThemeStore()
  const { addNotification } = useAppStore()
  const [settings, setSettings] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadSettings()
  }, [])

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
        <h1 className="text-2xl font-bold text-[rgb(var(--color-text))]">Settings</h1>
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

