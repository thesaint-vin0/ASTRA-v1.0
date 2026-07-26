import { create } from 'zustand'
import type { Conversation, Message, Personality } from '../types'
import { api } from '../services/api'

interface ChatState {
  conversations: Conversation[]
  activeConversation: Conversation | null
  messages: Message[]
  isStreaming: boolean
  streamingContent: string
  personalities: Personality[]
  selectedPersonality: string
  isLoading: boolean
  error: string | null

  loadConversations: () => Promise<void>
  selectConversation: (id: string) => Promise<void>
  createConversation: (title?: string, personality?: string) => Promise<Conversation>
  deleteConversation: (id: string) => Promise<void>
  setMessages: (messages: Message[]) => void
  appendToStream: (content: string) => void
  setIsStreaming: (streaming: boolean) => void
  clearStream: () => void
  addMessage: (message: Message) => void
  loadPersonalities: () => Promise<void>
  setPersonality: (personality: string) => void
  setError: (error: string | null) => void
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  activeConversation: null,
  messages: [],
  isStreaming: false,
  streamingContent: '',
  personalities: [],
  selectedPersonality: 'professional',
  isLoading: false,
  error: null,

  loadConversations: async () => {
    set({ isLoading: true, error: null })
    try {
      const data = await api.conversations.list()
      set({ conversations: data.conversations, isLoading: false })
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false })
    }
  },

  selectConversation: async (id: string) => {
    set({ isLoading: true, error: null })
    try {
      const conv = await api.conversations.get(id)
      const { messages: msgs } = await api.conversations.messages(id)
      set({
        activeConversation: conv,
        messages: msgs || [],
        isLoading: false,
      })
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false })
    }
  },

  createConversation: async (title?: string, personality?: string) => {
    set({ isLoading: true, error: null })
    try {
      const conv = await api.conversations.create(title, personality || get().selectedPersonality)
      set((state) => ({
        conversations: [conv, ...state.conversations],
        activeConversation: conv,
        messages: [],
        isLoading: false,
      }))
      return conv
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false })
      throw err
    }
  },

  deleteConversation: async (id: string) => {
    set({ isLoading: true, error: null })
    try {
      await api.conversations.delete(id)
      set((state) => ({
        conversations: state.conversations.filter((c) => c.id !== id),
        activeConversation: state.activeConversation?.id === id ? null : state.activeConversation,
        messages: state.activeConversation?.id === id ? [] : state.messages,
        isLoading: false,
      }))
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false })
    }
  },

  setMessages: (messages) => set({ messages }),
  appendToStream: (content) =>
    set((state) => ({ streamingContent: state.streamingContent + content })),
  setIsStreaming: (streaming) => set({ isStreaming: streaming }),
  clearStream: () => set({ streamingContent: '' }),
  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),
  loadPersonalities: async () => {
    try {
      const data = await api.personalities.list()
      set({ personalities: Object.values(data.personalities) })
    } catch {
      // Silently fail - personalities are loaded from config
    }
  },
  setPersonality: (personality) => set({ selectedPersonality: personality }),
  setError: (error) => set({ error }),
}))
