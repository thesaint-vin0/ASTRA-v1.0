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

export interface Model {
  name: string
  provider: 'ollama' | 'openai' | 'anthropic'
  available: boolean
  size: number
  details?: Record<string, unknown>
}

export interface Plugin {
  name: string
  version: string
  description: string
  author: string
  type: string
  status: 'installed' | 'active' | 'disabled' | 'error'
  loaded_at?: string
}

export interface FileItem {
  name: string
  type: 'file' | 'directory'
  size: number
  modified: string
}

export interface Tool {
  name: string
  description: string
  parameters: Record<string, unknown>
  category: string
}

export interface Personality {
  name: string
  system_prompt: string
  temperature: number
  style: string
}

export interface AppSettings {
  [key: string]: unknown
}

export interface Plan {
  id: string
  goal: string
  type: string
  tasks: Task[]
  dependencies: Record<string, string[]>
  timeline: { total_estimated_minutes: number; total_tasks: number; parallel_potential: number }
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
