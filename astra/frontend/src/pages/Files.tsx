import { useState, useCallback, useMemo, memo, useRef, useEffect } from 'react'
import { Folder, File, FileText, Image, ArrowLeft, Search, Home } from 'lucide-react'
import { api } from '../services/api'
import { useRouteFocus } from '../hooks/useRouteFocus'
import type { FileItem } from '../types'

const fileIcons: Record<string, React.ReactNode> = {
  directory: <Folder size={16} className="text-yellow-500" />,
  pdf: <FileText size={16} className="text-red-500" />,
  docx: <FileText size={16} className="text-blue-500" />,
  xlsx: <FileText size={16} className="text-green-500" />,
  image: <Image size={16} className="text-purple-500" />,
  default: <File size={16} className="text-[rgb(var(--color-text-secondary))]" />,
}

function getFileIcon(item: FileItem): React.ReactNode {
  if (item.type === 'directory') return fileIcons.directory
  const ext = item.name.split('.').pop()?.toLowerCase()
  if (ext === 'pdf') return fileIcons.pdf
  if (['docx', 'doc'].includes(ext || '')) return fileIcons.docx
  if (['xlsx', 'xls', 'csv'].includes(ext || '')) return fileIcons.xlsx
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext || '')) return fileIcons.image
  return fileIcons.default
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 KB'
  return `${(bytes / 1024).toFixed(1)} KB`
}

const FileItemRow = memo(function FileItemRow({
  item,
  onOpen,
  isFocused,
  onFocusMove,
  tabIndex,
}: {
  item: FileItem
  onOpen: (item: FileItem) => void
  isFocused: boolean
  onFocusMove: (dir: 'next' | 'prev' | 'first' | 'last') => void
  tabIndex: number
}) {
  const rowRef = useRef<HTMLButtonElement>(null)

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      onFocusMove('next')
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      onFocusMove('prev')
    } else if (e.key === 'Home') {
      e.preventDefault()
      onFocusMove('first')
    } else if (e.key === 'End') {
      e.preventDefault()
      onFocusMove('last')
    }
  }

  return (
    <button
      ref={rowRef}
      onClick={() => onOpen(item)}
      onKeyDown={handleKeyDown}
      tabIndex={tabIndex}
      role="listitem"
      aria-label={`${item.type === 'directory' ? 'Open folder' : 'Open file'}: ${item.name}`}
      className={`flex items-center gap-3 p-3 rounded-lg hover:bg-[rgb(var(--color-surface))] transition-all text-left border border-transparent hover:border-[rgb(var(--color-border))] focus:outline-none ${
        isFocused ? 'ring-2 ring-astra-500' : ''
      }`}
    >
      {getFileIcon(item)}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-[rgb(var(--color-text))] truncate">{item.name}</p>
        <p className="text-xs text-[rgb(var(--color-text-secondary))]">
          {item.type === 'directory' ? 'Folder' : formatSize(item.size)}
        </p>
      </div>
    </button>
  )
})

export default function Files() {
  const { ref: headingRef } = useRouteFocus()
  const [currentPath, setCurrentPath] = useState('')
  const [items, setItems] = useState<FileItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [content, setContent] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [focusedIndex, setFocusedIndex] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)

  const navigateTo = useCallback(async (path: string) => {
    setLoading(true)
    setError(null)
    setContent(null)
    try {
      const data = await api.files.list(path)
      if (data.success && data.items) {
        setItems(data.items)
        setCurrentPath(path)
        setFocusedIndex(0)
      } else {
        setError('Failed to list directory')
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  const openFile = useCallback(async (path: string) => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.files.read(path)
      if (data.success) {
        setContent(data.content || '')
      } else {
        setError('Failed to read file')
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleItemClick = useCallback((item: FileItem) => {
    const path = currentPath ? `${currentPath}/${item.name}` : item.name
    if (item.type === 'directory') {
      navigateTo(path)
    } else {
      openFile(path)
    }
  }, [currentPath, navigateTo, openFile])

  const goBack = useCallback(() => {
    const parent = currentPath.split('/').slice(0, -1).join('/')
    navigateTo(parent || '.')
  }, [currentPath, navigateTo])

  const goHome = useCallback(() => navigateTo('.'), [navigateTo])

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return
    setLoading(true)
    setError(null)
    try {
      const data = await api.files.list(searchQuery.trim())
      if (data.success && data.items) {
        setItems(data.items)
        setCurrentPath(searchQuery.trim())
        setFocusedIndex(0)
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [searchQuery])

  const moveFocus = useCallback((dir: 'next' | 'prev' | 'first' | 'last') => {
    setFocusedIndex((prev) => {
      const max = items.length - 1
      if (dir === 'next') return Math.min(prev + 1, max)
      if (dir === 'prev') return Math.max(prev - 1, 0)
      if (dir === 'first') return 0
      return max
    })
  }, [items.length])

  // Focus the newly focused row on arrow navigation
  useEffect(() => {
    const rows = listRef.current?.querySelectorAll<HTMLButtonElement>('[role="listitem"]')
    rows?.[focusedIndex]?.focus()
  }, [focusedIndex])

  const itemCount = useMemo(() => items.length, [items])
  const hasBack = useMemo(() => currentPath.length > 0, [currentPath])

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-bold text-[rgb(var(--color-text))] focus:outline-none">File Explorer</h1>
          <p className="text-sm text-[rgb(var(--color-text-secondary))] mt-1">{currentPath || 'Root'}</p>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[rgb(var(--color-text-secondary))]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search files and directories..."
            className="input pl-10"
            aria-label="Search files and directories"
          />
        </div>
        <button onClick={handleSearch} className="btn-primary text-sm">Search</button>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <button onClick={goHome} className="btn-ghost p-2" title="Home" aria-label="Go to home directory">
          <Home size={16} />
        </button>
        <button onClick={goBack} className="btn-ghost p-2" disabled={!hasBack} title="Back" aria-label="Go back">
          <ArrowLeft size={16} />
        </button>
        <span className="text-sm text-[rgb(var(--color-text-secondary))] truncate">
          {currentPath || '/'}
        </span>
      </div>

      {error && (
        <div className="p-4 mb-4 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-500" role="alert">
          {error}
        </div>
      )}

      {content ? (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-[rgb(var(--color-text))]">File Content</h3>
            <button onClick={() => setContent(null)} className="btn-ghost text-xs" aria-label="Close file content">
              Back
            </button>
          </div>
          <pre className="text-sm text-[rgb(var(--color-text))] whitespace-pre-wrap font-mono bg-[rgb(var(--color-bg))] p-4 rounded-lg max-h-[600px] overflow-auto scrollbar-thin">
            {content}
          </pre>
        </div>
      ) : loading ? (
        <div className="text-center py-12" role="status" aria-live="polite">
          <div className="w-8 h-8 border-2 border-astra-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-[rgb(var(--color-text-secondary))]">Loading...</p>
        </div>
      ) : (
        <div ref={listRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2" role="list" aria-label="Files and directories">
          {itemCount === 0 ? (
            <div className="col-span-full text-center py-12">
              <Folder size={48} className="text-[rgb(var(--color-text-secondary))] mx-auto mb-3 opacity-50" aria-hidden="true" />
              <p className="text-[rgb(var(--color-text-secondary))]">No files found</p>
              <p className="text-sm text-[rgb(var(--color-text-secondary))] mt-1">Navigate to a directory to browse files</p>
            </div>
          ) : (
            items.map((item, i) => (
              <FileItemRow
                key={`${currentPath}/${item.name}`}
                item={item}
                onOpen={handleItemClick}
                isFocused={i === focusedIndex}
                onFocusMove={moveFocus}
                tabIndex={i === focusedIndex ? 0 : -1}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}

