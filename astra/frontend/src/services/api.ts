import type { Conversation, Memory, Model, Plugin, Tool, FileItem, Plan, AppSettings, Personality, SystemMetrics, OnboardingCheckResult, ActivityResponse } from '../types'

const API_BASE = '/api'

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(error || `HTTP ${response.status}`)
  }

  return response.json()
}

export const api = {
  // Health
  health: () => request<{ status: string; app: string; version: string }>('/health'),
  status: () => request<{ engine: Record<string, unknown>; config: Record<string, unknown> }>('/status'),

  // System Metrics
  system: {
    metrics: () => request<SystemMetrics>('/system/metrics'),
  },

  // Conversations
  conversations: {
    list: (limit = 50, offset = 0) =>
      request<{ conversations: Conversation[]; total: number }>(`/conversations?limit=${limit}&offset=${offset}`),
    get: (id: string) => request<Conversation>(`/conversations/${id}`),
    create: (title = 'New Conversation', personality = 'professional', system_prompt?: string) =>
      request<Conversation>('/conversations', {
        method: 'POST',
        body: JSON.stringify({ title, personality, system_prompt }),
      }),
    delete: (id: string) =>
      request<{ success: boolean }>(`/conversations/${id}`, { method: 'DELETE' }),
    messages: (id: string, limit = 50) =>
      request<{ messages: Conversation['messages'] }>(`/conversations/${id}/messages?limit=${limit}`),
  },

  // Chat
  chat: (conversation_id: string, message: string, options: { stream?: boolean; personality?: string; tools_enabled?: boolean } = {}) => {
    const { stream = true, personality, tools_enabled = true } = options
    return fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversation_id, message, stream, personality, tools_enabled }),
    })
  },

  // Memory
  memory: {
    search: (query: string, memory_type?: string, limit = 20) =>
      request<{ results: Memory[]; total: number }>('/memory/search', {
        method: 'POST',
        body: JSON.stringify({ query, memory_type, limit }),
      }),
    recent: (limit = 10) =>
      request<{ results: Memory[]; total: number }>('/memory/recent', {
        method: 'POST',
        body: JSON.stringify({ limit }),
      }),
    delete: (id: string) =>
      request<{ success: boolean }>(`/memory/${id}`, { method: 'DELETE' }),
  },

  // Models
  models: {
    list: () => request<{ models: Model[]; default: string }>('/models'),
  },

  // Tools
  tools: {
    list: () => request<{ tools: Tool[] }>('/tools'),
    execute: (tool_name: string, arguments_: Record<string, unknown>) =>
      request<Record<string, unknown>>('/tools/execute', {
        method: 'POST',
        body: JSON.stringify({ tool_name, arguments: arguments_ }),
      }),
  },

  // Personalities
  personalities: {
    list: () => request<{ personalities: Record<string, Personality> }>('/personalities'),
  },

  // Plugins
  plugins: {
    list: () => request<{ plugins: Plugin[] }>('/plugins'),
  },

  // Plans
  plans: {
    create: (goal: string) =>
      request<Plan>('/plan', { method: 'POST', body: JSON.stringify({ goal }) }),
  },

  // Settings
  settings: {
    get: () => request<AppSettings>('/settings'),
    update: (key: string, value: unknown, category = 'general') =>
      request<{ success: boolean }>('/settings', {
        method: 'POST',
        body: JSON.stringify({ key, value, category }),
      }),
  },

  // Files
  files: {
    read: (path: string) =>
      request<{ success: boolean; content?: string }>('/files/read', {
        method: 'POST',
        body: JSON.stringify({ path }),
      }),
    list: (path: string) =>
      request<{ success: boolean; items?: FileItem[] }>('/files/list', {
        method: 'POST',
        body: JSON.stringify({ path }),
      }),
  },

  // Vision
  vision: {
    screenshot: () => request<Record<string, unknown>>('/vision/screenshot', { method: 'POST' }),
  },

  // Onboarding
  onboarding: {
    check: () => request<OnboardingCheckResult>('/onboarding/check', { method: 'POST' }),
  },

  // Activity
  activity: (limit = 20) => request<ActivityResponse>(`/activity?limit=${limit}`),

  // Model Management
  modelManager: {
    pull: (name: string) => {
      return fetch('/api/models/pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
    },
    remove: (name: string) =>
      request<{ success: boolean }>('/models/remove', {
        method: 'POST',
        body: JSON.stringify({ name }),
      }),
    health: () => request<Record<string, unknown>>('/models/health'),
  },
}

