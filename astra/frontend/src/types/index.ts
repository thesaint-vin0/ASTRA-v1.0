// ── Messages & Conversations ──

export interface Message {
  id: string
  conversation_id: string
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  content_type: string
  tool_calls?: Record<string, unknown>
  tool_results?: Record<string, unknown>
  extra_data?: Record<string, unknown>
  token_count: number
  created_at: string
}

export interface Conversation {
  id: string
  title: string
  personality: string
  model: string
  system_prompt?: string
  metadata: Record<string, unknown>
  is_archived: boolean
  token_count: number
  created_at: string
  updated_at: string
  messages?: Message[]
}

// ── Memory ──

export interface Memory {
  id: string
  memory_type: 'short_term' | 'long_term' | 'knowledge'
  key: string
  content: string
  summary?: string
  category?: string
  tags?: string[]
  importance: number
  created_at: string
  source?: string
  score?: number
}

// ── Models ──

export interface Model {
  name: string
  provider: 'ollama' | 'openai' | 'anthropic'
  available: boolean
  size: number
  details?: Record<string, unknown>
}

export interface ModelDetails {
  families?: string[]
  parameter_size?: string
  quantization_level?: string
  context_length?: number
  speed?: string
  quality?: string
  ram_required?: string
}

// ── Plugins ──

export interface Plugin {
  name: string
  version: string
  description: string
  author: string
  type: string
  status: 'installed' | 'active' | 'disabled' | 'error'
  loaded_at?: string
}

// ── Files ──

export interface FileItem {
  name: string
  type: 'file' | 'directory'
  size: number
  modified: string
}

// ── Tools ──

export interface Tool {
  name: string
  description: string
  parameters: Record<string, unknown>
  category: string
}

// ── Personalities ──

export interface Personality {
  name: string
  system_prompt: string
  temperature: number
  style: string
}

// ── Settings ──

export interface AppSettings {
  [key: string]: unknown
}

// ── Plans ──

export interface Plan {
  id: string
  goal: string
  type: string
  tasks: Task[]
  dependencies: Record<string, string[]>
  timeline: {
    total_estimated_minutes: number
    total_tasks: number
    parallel_potential: number
  }
  total_tasks: number
  completed_tasks: number
  status: string
  created_at: string
}

export interface Task {
  id: string
  name: string
  description: string
  order: number
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  dependencies: string[]
  estimated_minutes: number
  assigned_tool?: string
  result?: unknown
}

// ── WebSocket ──

export interface WSMessage {
  type: string
  content?: string
  conversation_id?: string
  stream?: boolean
  prompt?: string
}

export interface WSEvent {
  type: string
  [key: string]: unknown
}

// ── System Status ──

export interface SystemStatus {
  engine: {
    active_tasks: number
    active_conversations: number
    short_term_memories: number
    vector_store_size: number
    available_tools: number
    available_models: string[]
    plugins_loaded: number
    systems_initialized: boolean
  }
  config: {
    app_name: string
    app_version: string
    environment: string
    default_local_model: string
    local_model_provider: string
    streaming: boolean
    gpu_enabled: boolean
  }
}

// ── System Metrics ──

export interface SystemMetrics {
  cpu: {
    usage_percent: number
    cores: number
    model: string
  }
  memory: {
    total_gb: number
    used_gb: number
    usage_percent: number
  }
  gpu: {
    available: boolean
    name?: string
    vram_total_gb?: number
    vram_used_gb?: number
    usage_percent?: number
  }
  disk: {
    total_gb: number
    free_gb: number
    usage_percent: number
  }
  ollama: {
    status: 'running' | 'not_found' | 'error'
    version?: string
    models: string[]
  }
  database: {
    status: 'connected' | 'error'
    size_mb?: number
  }
  chroma: {
    status: 'initialized' | 'error'
    document_count?: number
  }
  plugins: {
    total: number
    active: number
    errors: number
  }
  uptime: number
  version: string
  platform: string
}

// ── Tutorials ──

export interface Tutorial {
  id: string
  title: string
  description: string
  category: TutorialCategory
  icon: string
  steps: TutorialStep[]
  duration: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  completed?: boolean
  progress?: number
}

export type TutorialCategory =
  | 'chat'
  | 'voice'
  | 'vision'
  | 'coding'
  | 'research'
  | 'planning'
  | 'automation'
  | 'plugins'
  | 'memory'
  | 'documents'
  | 'local_ai'
  | 'cloud_ai'

export interface TutorialStep {
  title: string
  content: string
  action?: string
  image?: string
}

// ── Tutorial Progress ──

export interface TutorialProgress {
  tutorialId: string
  currentStep: number
  completed: boolean
  completedAt?: string
  lastAccessedAt: string
}

// ── Help Center ──

export interface HelpArticle {
  id: string
  title: string
  description: string
  category: string
  tags: string[]
  content: string
  related: string[]
  updated_at: string
}

// ── System Check ──

export interface SystemCheckItem {
  name: string
  label: string
  status: 'checked' | 'missing' | 'error'
  version?: string
  message?: string
  autoFixAvailable?: boolean
}

export interface OnboardingCheckResult {
  python: { status: 'healthy' | 'missing' | 'warning'; version?: string; message: string; fix: string | null }
  ollama: { status: 'healthy' | 'missing' | 'warning'; version?: string; message: string; models?: string[]; fix: string | null }
  gpu: { status: 'healthy' | 'missing'; name?: string; vram_gb?: number; message: string; fix: string | null }
  cpu: { status: 'healthy' | 'warning'; cores?: number; usage_percent?: number; name?: string; message: string; fix: string | null }
  ram: { status: 'healthy' | 'warning'; total_gb?: number; available_gb?: number; used_gb?: number; percent?: number; message: string; fix: string | null }
  disk: { status: 'healthy' | 'warning'; total_gb?: number; free_gb?: number; used_gb?: number; percent?: number; message: string; fix: string | null }
  sqlite: { status: 'healthy' | 'missing' | 'error'; version?: string; message: string; fix: string | null }
  chroma: { status: 'healthy' | 'missing'; message: string; fix: string | null }
  playwright: { status: 'healthy' | 'missing'; message: string; fix: string | null }
  whisper: { status: 'healthy' | 'missing'; message: string; fix: string | null }
  piper: { status: 'healthy' | 'missing'; message: string; fix: string | null }
  internet: { status: 'healthy' | 'warning'; message: string; fix: string | null }
  duration_ms: number
}

// ── Activity ──

export interface ActivityEvent {
  id: string
  type: 'conversation' | 'memory' | 'model' | 'plugin' | 'system' | 'update' | 'error'
  title: string
  description: string
  timestamp: string
  icon?: string
}

export interface ActivityResponse {
  activities: ActivityEvent[]
}

// ── Dashboard Widget ──

export type WidgetType = 'ai-status' | 'system-status' | 'system-metrics' | 'activity' | 'quick-actions'
export type WidgetSize = 'small' | 'medium' | 'large' | 'full'

export interface DashboardWidget {
  id: WidgetType
  type: WidgetType
  title: string
  visible: boolean
  size: WidgetSize
  order: number
  x: number
  y: number
  w: number
  h: number
}

export interface DashboardLayout {
  widgets: DashboardWidget[]
  version: number
}

// ── Automation ──

export interface Workflow {
  id: string
  name: string
  description: string
  steps: WorkflowStep[]
  triggers: WorkflowTrigger[]
  status: 'active' | 'disabled' | 'error'
  last_run?: string
  created_at: string
}

export interface WorkflowStep {
  id: string
  type: 'open_app' | 'close_app' | 'launch_url' | 'type_text' | 'click' | 'wait' | 'run_command'
  params: Record<string, unknown>
  order: number
}

export interface WorkflowTrigger {
  type: 'schedule' | 'event' | 'hotkey'
  config: Record<string, unknown>
}

// ── Electron API ──

export interface ElectronAPI {
  minimize: () => Promise<void>
  maximize: () => Promise<void>
  close: () => Promise<void>
  isMaximized: () => Promise<boolean>
  isFocused: () => Promise<boolean>
  setAlwaysOnTop: (onTop: boolean) => Promise<boolean>
  isAlwaysOnTop: () => Promise<boolean>
  setFullScreen: (fullscreen: boolean) => Promise<boolean>
  isFullScreen: () => Promise<boolean>
  getAllDisplays: () => Promise<DisplayInfo[]>
  getCurrentDisplay: () => Promise<DisplayInfo | null>
  onMaximizeChange: (callback: (isMaximized: boolean) => void) => () => void
  onFullscreenChange: (callback: (isFullscreen: boolean) => void) => () => void
  onCommand: (command: string, callback: () => void) => () => void
  onMemoryUsage: (callback: (data: MemoryUsage) => void) => () => void
  getVersion: () => Promise<string>
  getName: () => Promise<string>
  getPath: (name: string) => Promise<string>
  quit: () => Promise<void>
  restart: () => Promise<void>
  getSystemInfo: () => Promise<SystemInfo>
  setProgressBar: (progress: number) => Promise<void>
  setBadgeCount: (count: number) => Promise<void>
  getBadgeCount: () => Promise<number>
  showNotification: (opts: { title: string; body: string; silent?: boolean }) => Promise<boolean>
  onNotificationClicked: (callback: () => void) => () => void
  openExternal: (url: string) => Promise<void>
  showItemInFolder: (filePath: string) => Promise<void>
  openPath: (filePath: string) => Promise<void>
  setLaunchOnStartup: (enable: boolean, startMinimized?: boolean) => Promise<boolean>
  getLaunchOnStartup: () => Promise<boolean>
  createDesktopShortcut: () => Promise<{ success: boolean; path?: string; error?: string }>
  onFileOpenWith: (callback: (filePaths: string[]) => void) => () => void
  getSettings: () => Promise<AppSettings>
  setSetting: (key: string, value: unknown) => Promise<boolean>
  openFileDialog: (options?: DialogOptions) => Promise<DialogResult>
  openFolderDialog: () => Promise<DialogResult>
  saveFileDialog: (options?: DialogOptions) => Promise<DialogResult>
  importFile: (filePath: string) => Promise<FileImportResult>
  processDroppedFiles: (filePaths: string[]) => Promise<ProcessDroppedResult>
  restoreSession: () => Promise<SessionResult>
  saveSession: (session: Record<string, unknown>) => Promise<{ success: boolean; error?: string }>
  clearSession: () => Promise<{ success: boolean; error?: string }>
getFeatures: () => Promise<Record<string, boolean>>
  isFeatureEnabled: (name: string) => Promise<boolean>
  createBackup: () => Promise<{ success: boolean }>
  listBackups: () => Promise<{ success: boolean; backups?: string[]; error?: string }>
  restoreBackup: (filename: string) => Promise<{ success: boolean; error?: string }>
  getCrashLogs: () => Promise<{ success: boolean; logs?: string; error?: string }>
  clearCrashLogs: () => Promise<{ success: boolean; error?: string }>

  // "Open with Astra" — file association support (drain pending paths queued before renderer was ready)
  getPendingOpenPaths: () => Promise<string[]>

  // Auto-update
  checkForUpdates: () => Promise<{ success: boolean; state?: UpdateState; error?: string }>
  downloadUpdate: () => Promise<{ success: boolean; error?: string }>
  installUpdate: () => Promise<{ success: boolean; error?: string }>
  getUpdateStatus: () => Promise<UpdateStatus>
  setAutoUpdate: (enabled: boolean) => Promise<{ success: boolean; autoDownload: boolean }>
  setUpdateChannel: (channel: UpdateChannel) => Promise<{ success: boolean; channel?: UpdateChannel; error?: string }>
  onUpdateStatus: (callback: (status: UpdateStatus) => void) => () => void
}

export type UpdateChannel = 'stable' | 'beta'

export type UpdateState =
  | 'idle'
  | 'checking'
  | 'available'
  | 'not_available'
  | 'downloading'
  | 'downloaded'
  | 'installing'
  | 'error'

export interface UpdateDownloadProgress {
  percent: number
  bytesPerSecond: number
  transferred: number
  total: number
}

export interface UpdateStatus {
  state: UpdateState
  currentVersion: string
  latestVersion?: string
  downloadProgress?: UpdateDownloadProgress
  error?: string
  channel: UpdateChannel
  autoDownload: boolean
}

export interface DisplayInfo {
  id: number
  bounds: { x: number; y: number; width: number; height: number }
  workArea: { x: number; y: number; width: number; height: number }
  size: { width: number; height: number }
  scaleFactor: number
  isPrimary: boolean
}

export interface SystemInfo {
  platform: string
  arch: string
  electronVersion: string
  nodeVersion: string
  chromeVersion: string
}

export interface MemoryUsage {
  heapUsed: number
  heapTotal: number
  external: number
  arrayBuffers: number
}

export interface DialogOptions {
  filters?: Array<{ name: string; extensions: string[] }>
  defaultPath?: string
}

export interface DialogResult {
  canceled: boolean
  filePaths: string[]
  bookmark?: string
}

export interface FileImportResult {
  success: boolean
  file?: {
    name: string
    path: string
    size: number
    ext: string
    content: string
  }
  error?: string
}

export interface ProcessDroppedResult {
  success: boolean
  files: Array<{
    name: string
    path: string
    type: 'file' | 'directory'
    ext?: string
    size: number
  }>
  error?: string
}

export interface SessionResult {
  success: boolean
  session: Record<string, unknown> | null
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}
