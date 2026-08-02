import { memo, useCallback } from 'react'
import { List } from 'react-window'
import { useChatStore } from '../stores/chatStore'
import { MessageSquare, Trash2, Plus } from 'lucide-react'

interface ConversationListProps {
  onNewChat: () => void
}

interface RowData {
  conversations: Array<{ id: string; title: string }>
  activeConversationId: string | null
  onSelect: (id: string) => void
  onDelete: (id: string) => void
}

function ConversationRow({
  index,
  style,
  conversations,
  activeConversationId,
  onSelect,
  onDelete,
}: {
  index: number
  style: React.CSSProperties
  conversations: Array<{ id: string; title: string }>
  activeConversationId: string | null
  onSelect: (id: string) => void
  onDelete: (id: string) => void
}): React.ReactElement | null {
  const conv = conversations[index]
  const isActive = activeConversationId === conv.id

  return (
    <div
      style={style}
      className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all duration-200 focus:outline-none ${
        isActive
          ? 'bg-astra-600/10 text-astra-400'
          : 'text-[rgb(var(--color-text-secondary))] hover:bg-[rgb(var(--color-bg))] hover:text-[rgb(var(--color-text))]'
      }`}
      onClick={() => onSelect(conv.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect(conv.id)
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`Conversation: ${conv.title}`}
      aria-current={isActive ? 'page' : undefined}
    >
      <MessageSquare size={14} className="flex-shrink-0" />
      <span className="text-sm truncate flex-1">{conv.title}</span>
      <button
        onClick={(e) => {
          e.stopPropagation()
          onDelete(conv.id)
        }}
        className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-all"
        aria-label={`Delete ${conv.title}`}
      >
        <Trash2 size={12} />
      </button>
    </div>
  )
}

function ConversationListComponent({ onNewChat }: ConversationListProps) {
  const conversations = useChatStore((s) => s.conversations)
  const activeConversationId = useChatStore((s) => s.activeConversation?.id ?? null)
  const selectConversation = useChatStore((s) => s.selectConversation)
  const deleteConversation = useChatStore((s) => s.deleteConversation)

  const handleSelect = useCallback((id: string) => {
    selectConversation(id)
  }, [selectConversation])

  const handleDelete = useCallback((id: string) => {
    deleteConversation(id)
  }, [deleteConversation])

  const rowProps: RowData = {
    conversations,
    activeConversationId,
    onSelect: handleSelect,
    onDelete: handleDelete,
  }

  const itemCount = conversations.length

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-[rgb(var(--color-border))]">
        <button onClick={onNewChat} className="btn-primary w-full flex items-center justify-center gap-2 text-sm">
          <Plus size={16} />
          New Chat
        </button>
      </div>

      <div className="flex-1 overflow-hidden" role="list" aria-label="Conversations">
        {itemCount === 0 ? (
          <p className="text-xs text-[rgb(var(--color-text-secondary))] text-center py-8">
            No conversations yet
          </p>
        ) : (
          <List<RowData>
            rowComponent={ConversationRow}
            rowCount={itemCount}
            rowHeight={48}
            rowProps={rowProps}
            overscanCount={5}
            style={{ height: '100%', maxHeight: '100%' }}
          />
        )}
      </div>
    </div>
  )
}

export default memo(ConversationListComponent)

