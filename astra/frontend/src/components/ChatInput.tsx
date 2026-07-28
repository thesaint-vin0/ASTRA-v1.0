import { useState, useRef, useEffect, KeyboardEvent } from 'react'
import { Send, Square, Mic, Image } from 'lucide-react'
import { useChatStore } from '../stores/chatStore'
import wsService from '../services/websocket'
import { showToast } from './Toast'

interface ChatInputProps {
  onSendMessage: (message: string) => void
  onCancel: () => void
}

export default function ChatInput({ onSendMessage, onCancel }: ChatInputProps) {
  const [input, setInput] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { isStreaming } = useChatStore()

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
    }
  }, [input])

  const handleSend = () => {
    const trimmed = input.trim()
    if (!trimmed || isStreaming) return
    onSendMessage(trimmed)
    setInput('')
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleVoiceInput = () => {
    showToast({ type: 'info', title: 'Voice input started... Speak now' })
  }

  const handleImageUpload = () => {
    showToast({ type: 'info', title: 'Image upload', message: 'Feature coming soon' })
  }

  return (
    <div className="border-t border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-end gap-2 bg-[rgb(var(--color-bg))] rounded-xl border border-[rgb(var(--color-border))] p-2">
          <div className="flex items-center gap-1">
            <button onClick={handleVoiceInput} className="btn-ghost p-2" title="Voice input">
              <Mic size={18} />
            </button>
            <button onClick={handleImageUpload} className="btn-ghost p-2" title="Upload image">
              <Image size={18} />
            </button>
          </div>

          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message... (Shift+Enter for new line)"
            rows={1}
            className="flex-1 bg-transparent border-none outline-none resize-none text-sm text-[rgb(var(--color-text))] placeholder:text-[rgb(var(--color-text-secondary))] py-2 px-2 max-h-[200px]"
          />

          {isStreaming ? (
            <button onClick={onCancel} className="btn-ghost p-2 text-red-500 hover:text-red-400" title="Cancel generation">
              <Square size={18} />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="btn-primary p-2 disabled:opacity-50"
              title="Send message"
            >
              <Send size={18} />
            </button>
          )}
        </div>
        <p className="text-[10px] text-[rgb(var(--color-text-secondary))] text-center mt-2">
          Astra AI uses local models via Ollama. Responses are generated on your device.
        </p>
      </div>
    </div>
  )
}

