import { memo, useState, useCallback, useRef, useMemo } from 'react';
import type { Message } from '../types';
import { Bot, User, Copy, Check } from 'lucide-react';
import ContextMenu, { type ContextMenuItem } from './ContextMenu';

interface ChatMessageProps {
  message: Message;
}

function ChatMessageComponent({ message }: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [message.content]);

  const handleCopyWithTime = useCallback(async () => {
    const time = new Date(message.created_at).toLocaleString();
    await navigator.clipboard.writeText(`${message.content}\n\n— ${time}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [message.content, message.created_at]);

  const contextItems: ContextMenuItem[] = useMemo(
    () => [
      { id: 'copy', label: 'Copy message', onClick: handleCopy, shortcut: 'Ctrl+C' },
      { id: 'copy-time', label: 'Copy with timestamp', onClick: handleCopyWithTime },
    ],
    [handleCopy, handleCopyWithTime]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Open context menu via keyboard (Shift+F10 or Menu key)
      if ((e.shiftKey && e.key === 'F10') || e.key === 'ContextMenu') {
        e.preventDefault()
        const target = containerRef.current
        if (!target) return
        const rect = target.getBoundingClientRect()
        const openEvent = new MouseEvent('contextmenu', {
          bubbles: true,
          cancelable: true,
          clientX: rect.left + (isUser ? rect.width : 0),
          clientY: rect.bottom,
        })
        target.dispatchEvent(openEvent)
      }
    },
    [isUser]
  )

  if (isSystem) return null;

  return (
    <div
      ref={containerRef}
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''} animate-fade-in focus:outline-none`}
      role="listitem"
      aria-label={`${isUser ? 'User' : 'Assistant'} message`}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser ? 'bg-astra-600' : 'bg-[rgb(var(--color-surface))] border border-[rgb(var(--color-border))]'
        }`}
        aria-hidden="true"
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

        <div className={`flex items-center gap-2 mt-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-within:opacity-100 transition-opacity ${isUser ? 'flex-row-reverse' : ''}`}>
          <button
            onClick={handleCopy}
            className="text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-text))] p-1 rounded focus-visible:opacity-100"
            aria-label={copied ? 'Copied' : 'Copy message'}
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
          </button>
          <span className="text-[10px] text-[rgb(var(--color-text-secondary))]">
            {new Date(message.created_at).toLocaleTimeString()}
          </span>
        </div>
      </div>

      <ContextMenu items={contextItems} triggerRef={containerRef} />
    </div>
  );
}

export default memo(ChatMessageComponent);
