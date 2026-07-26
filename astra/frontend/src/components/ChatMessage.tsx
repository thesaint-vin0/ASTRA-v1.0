import type { Message } from '../types'
import { Bot, User, Copy, Check } from 'lucide-react'
import { useState } from 'react'

interface ChatMessageProps {
  message: Message
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const [copied, setCopied] = useState(false)
  const isUser = message.role === 'user'
  const isSystem = message.role === 'system'

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (isSystem) return null

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''} animate-fade-in`}>
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser ? 'bg-astra-600' : 'bg-[rgb(var(--color-surface))] border border-[rgb(var(--color-border))]'
        }`}
      >
        {isUser ? <User size={16} className="text-white" /> : <Bot size={16} className="text-astra-400" />}
      </div>

      <div className={`group max-w-[80%] ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
        <div
          className={`rounded-2xl px-4 py-2.5 ${
            isUser
              ? 'bg-astra-600 text-white rounded-br-md'
              : 'bg-[rgb(var(--color-surface))] border border-[rgb(var(--color-border))] rounded-bl-md'
          }`}
        >
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
        </div>

        <div className={`flex items-center gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity ${isUser ? 'flex-row-reverse' : ''}`}>
          <button onClick={handleCopy} className="text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-text))] p-1">
            {copied ? <Check size={12} /> : <Copy size={12} />}
          </button>
          <span className="text-[10px] text-[rgb(var(--color-text-secondary))]">
            {new Date(message.created_at).toLocaleTimeString()}
          </span>
        </div>
      </div>
    </div>
  )
}

