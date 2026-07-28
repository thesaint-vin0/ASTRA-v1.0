import { useState, useEffect } from 'react'
import { useThemeStore, type Theme } from '../stores/themeStore'
import { useAppStore } from '../stores/appStore'
import { api } from '../services/api'
import { Sun, Moon, Palette, Save, RefreshCw } from 'lucide-react'

export default function Settings() {
  const { theme, setTheme, customColors, setCustomColors } = useThemeStore()
  const { addNotification } = useAppStore()
  const [settings, setSettings] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const data = await api.settings.get()
      setSettings(data)
    } catch (err) {
      console.error('Failed to load settings:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme)
    addNotification('success', 'Theme changed to ' + newTheme)
  }

  const handleSave = async () => {
    try {
      addNotification('success', 'Settings saved')
    } catch (err) {
      addNotification('error', 'Failed to save settings')
    }
  }

  const themes: Array<{ value: Theme; label: string; icon: React.ReactNode }> = [
    { value: 'dark', label: 'Dark', icon: <Moon size={16} /> },
    { value: 'light', label: 'Light', icon: <Sun size={16} /> },
    { value: 'custom', label: 'Custom', icon: <Palette size={16} /> },
  ]

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[rgb(var(--color-text))]">Settings</h1>
        <p className="text-sm text-[rgb(var(--color-text-secondary))] mt-1">
          Customize your Astra AI experience
        </p>
      </div>

      <div className="space-y-6">
        {/* Theme Selection */}
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
              >
                <div className="flex flex-col items-center gap-2">
                  {t.icon}
                  <span className="text-sm font-medium">{t.label}</span>
                </div>
              </button>
            ))}
          </div>

          {theme === 'custom' && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-[rgb(var(--color-text))]">Custom Colors</h3>
              <div className="grid grid-cols-2 gap-4">
                <ColorInput label="Primary" value={customColors.primary} onChange={(v) => setCustomColors({ primary: v })} />
                <ColorInput label="Background" value={customColors.bg} onChange={(v) => setCustomColors({ bg: v })} />
                <ColorInput label="Surface" value={customColors.surface} onChange={(v) => setCustomColors({ surface: v })} />
                <ColorInput label="Text" value={customColors.text} onChange={(v) => setCustomColors({ text: v })} />
              </div>
          )}
        </div>

        {/* General Settings */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-[rgb(var(--color-text))] mb-4">General</h2>
          <div className="space-y-4">
            <SettingRow label="Default Personality" description="AI personality for new conversations">
              <select className="input text-sm">
                <option>Professional</option>
                <option>Friendly</option>
                <option>Technical</option>
                <option>Creative</option>
                <option>Researcher</option>
                <option>Minimal</option>
              </select>
            </SettingRow>
            <SettingRow label="Streaming" description="Enable real-time response streaming">
              <input type="checkbox" defaultChecked className="toggle" />
            </SettingRow>
            <SettingRow label="GPU Acceleration" description="Use GPU for model inference">
              <input type="checkbox" defaultChecked className="toggle" />
            </SettingRow>
          </div>

        {/* Model Settings */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-[rgb(var(--color-text))] mb-4">Model Configuration</h2>
          <div className="space-y-4">
            <SettingRow label="Default Model" description="Primary AI model for responses">
              <select className="input text-sm">
                <option>qwen2.5:7b</option>
                <option>llama3.2:3b</option>
                <option>mistral:7b</option>
              </select>
            </SettingRow>
            <SettingRow label="Fallback Model" description="Model to use if primary fails">
              <select className="input text-sm">
                <option>llama3.2:3b</option>
                <option>qwen2.5:7b</option>
                <option>phi:latest</option>
              </select>
            </SettingRow>
            <SettingRow label="Temperature" description="Response creativity (0 = precise, 1 = creative)">
              <input type="range" min="0" max="1" step="0.1" defaultValue={0.7} className="w-full" />
            </SettingRow>
          </div>

        {/* Update Settings */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-[rgb(var(--color-text))] mb-4">Updates</h2>
          <div className="space-y-4">
            <SettingRow label="Update Channel" description="Which release channel to track">
              <select className="input text-sm">
                <option>stable</option>
                <option>beta</option>
                <option>dev</option>
              </select>
            </SettingRow>
            <SettingRow label="Auto Update" description="Automatically download and install updates">
              <input type="checkbox" className="toggle" />
            </SettingRow>
          </div>

        {/* Save Button */}
        <div className="flex items-center justify-end gap-3">
          <button onClick={loadSettings} className="btn-secondary flex items-center gap-2">
            <RefreshCw size={16} />
            Reset
          </button>
          <button onClick={handleSave} className="btn-primary flex items-center gap-2">
            <Save size={16} />
            Save Settings
          </button>
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
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="input text-sm w-28"
        />
      </div>
  )
}
