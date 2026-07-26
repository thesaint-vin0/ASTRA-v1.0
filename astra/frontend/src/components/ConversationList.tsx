import { useChatStore } from '../stores/chatStore'
import { MessageSquare, Trash2, Plus } from 'lucide-react'

interface ConversationListProps {
  onNewChat: () => void
}

export default function ConversationList({ onNewChat }: ConversationListProps) {
  const { conversations, activeConversation, selectConversation, deleteConversation } = useChatStore()

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-[rgb(var(--color-border))]">
        <button onClick={onNewChat} className="btn-primary w-full flex items-center justify-center gap-2 text-sm">
          <Plus size={16} />
          New Chat
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-1">
        {conversations.length === 0 ? (
          <p className="text-xs text-[rgb(var(--color-text-secondary))] text-center py-8">
            No conversations yet
          </p>
        ) : (
          conversations.map((conv) => (
            <div
              key={conv.id}
              className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all duration-200 ${
                activeConversation?.id === conv.id
                  ? 'bg-astra-600/10 text-astra-400'
                  : 'text-[rgb(var(--color-text-secondary))] hover:bg-[rgb(var(--color-bg))] hover:text-[rgb(var(--color-text))]'
              }`}
              onClick={() => selectConversation(conv.id)}
            >
              <MessageSquare size={14} className="flex-shrink-0" />
              <span className="text-sm truncate flex-1">{conv.title}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  deleteConversation(conv.id)
                }}
                className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-all"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

