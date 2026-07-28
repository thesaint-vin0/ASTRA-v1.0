import { useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import ChatMessage from '../components/ChatMessage'
import ChatInput from '../components/ChatInput'
import ConversationList from '../components/ConversationList'
import { useChatStore } from '../stores/chatStore'
import wsService from '../services/websocket'
import { api } from '../services/api'
import type { Message } from '../types'
import { Bot } from 'lucide-react'
import { showToast } from '../components/Toast'

export default function Chat() {
  const { conversationId } = useParams()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const {
    messages,
    isStreaming,
    streamingContent,
    activeConversation,
    loadConversations,
    selectConversation,
    createConversation,
    setMessages,
    addMessage,
    appendToStream,
    setIsStreaming,
    clearStream,
  } = useChatStore()

  useEffect(() => {
    loadConversations()
    if (conversationId) {
      selectConversation(conversationId)
    }
  }, [conversationId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  // WebSocket event listeners
  useEffect(() => {
    const unsubChunk = wsService.on('chunk', (event) => {
      appendToStream(event.content as string)
    })

    const unsubComplete = wsService.on('complete', (event) => {
      const msg = event.message as Message
      addMessage(msg)
      clearStream()
      setIsStreaming(false)
    })

    const unsubError = wsService.on('error', (event) => {
      showToast({ type: 'error', title: 'Error', message: (event.error as string) || 'An error occurred' })
      setIsStreaming(false)
      clearStream()
    })

    const unsubMessageStored = wsService.on('message_stored', (event) => {
      const msg = event.message as Message
      addMessage(msg)
    })

    return () => {
      unsubChunk()
      unsubComplete()
      unsubError()
      unsubMessageStored()
    }
  }, [])

  const handleSendMessage = async (content: string) => {
    let convId = activeConversation?.id || 'new'

    if (!activeConversation) {
      try {
        const conv = await createConversation(content.slice(0, 100))
        convId = conv.id
} catch {
        showToast({ type: 'error', title: 'Failed to create conversation' })
        return
      }
    }

    setIsStreaming(true)
    wsService.sendMessage(content, convId)
  }

  const handleCancel = () => {
    wsService.sendCancel()
    setIsStreaming(false)
    clearStream()
  }

  const handleNewChat = async () => {
    try {
      await createConversation()
    } catch {
      showToast({ type: 'error', title: 'Failed to create new conversation' })
    }
  }

  const allMessages = [
    ...messages,
    ...(isStreaming && streamingContent
      ? [
          {
            id: 'streaming',
            conversation_id: activeConversation?.id || '',
            role: 'assistant' as const,
            content: streamingContent,
            content_type: 'text',
            token_count: 0,
            created_at: new Date().toISOString(),
          },
        ]
      : []),
  ]

  return (
    <div className="flex h-full">
      {/* Conversation sidebar */}
      <div className="w-64 border-r border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))]">
        <ConversationList onNewChat={handleNewChat} />
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col">
        {allMessages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-md p-8">
              <div className="w-16 h-16 rounded-2xl bg-astra-600/20 flex items-center justify-center mx-auto mb-4">
                <Bot size={32} className="text-astra-400" />
              </div>
              <h2 className="text-xl font-semibold text-[rgb(var(--color-text))] mb-2">
                Start a conversation
              </h2>
              <p className="text-sm text-[rgb(var(--color-text-secondary))]">
                Ask me anything - I can help with writing, analysis, coding, research, and more.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-4">
            <div className="max-w-4xl mx-auto space-y-4">
              {allMessages.map((msg, i) => (
                <ChatMessage key={msg.id || i} message={msg} />
              ))}
              {isStreaming && !streamingContent && (
                <div className="flex items-center gap-2 text-[rgb(var(--color-text-secondary))]">
                  <div className="w-2 h-2 rounded-full bg-astra-500 animate-pulse" />
                  <span className="text-sm">Thinking...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
        )}

        <ChatInput onSendMessage={handleSendMessage} onCancel={handleCancel} />
      </div>
    </div>
  )
}

