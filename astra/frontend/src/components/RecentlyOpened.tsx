import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, File, FileText, Image, X } from 'lucide-react'

interface RecentFile {
  path: string
  name: string
  type: 'file' | 'directory'
  ext?: string
  openedAt: string
  size: number
}

const STORAGE_KEY = 'astra-recent-files'
const MAX_RECENT = 10

function getFileIcon(ext?: string) {
  if (!ext) return <File size={16} className="text-[rgb(var(--color-text-secondary))]" />
  const iconMap: Record<string, React.ReactNode> = {
    pdf: <FileText size={16} className="text-red-500" />,
    docx: <FileText size={16} className="text-blue-500" />,
    xlsx: <FileText size={16} className="text-green-500" />,
    pptx: <FileText size={16} className="text-orange-500" />,
    txt: <FileText size={16} className="text-gray-500" />,
    md: <FileText size={16} className="text-purple-500" />,
    png: <Image size={16} className="text-pink-500" />,
    jpg: <Image size={16} className="text-pink-500" />,
    jpeg: <Image size={16} className="text-pink-500" />,
    gif: <Image size={16} className="text-pink-500" />,
    svg: <Image size={16} className="text-pink-500" />,
  }
  return iconMap[ext] ?? <File size={16} className="text-[rgb(var(--color-text-secondary))]" />
}

function loadRecent(): RecentFile[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return JSON.parse(stored)
  } catch { /* ignore */ }
  return []
}

function saveRecent(files: RecentFile[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(files))
  } catch { /* ignore */ }
}

export function addRecentFile(file: Omit<RecentFile, 'openedAt'>) {
  const recent = loadRecent()
  const filtered = recent.filter((f) => f.path !== file.path)
  const updated = [{ ...file, openedAt: new Date().toISOString() }, ...filtered].slice(0, MAX_RECENT)
  saveRecent(updated)
}

export function clearRecentFiles() {
  saveRecent([])
}

interface RecentlyOpenedProps {
  onOpenFile?: (file: RecentFile) => void
  maxDisplay?: number
}

export default function RecentlyOpened({ onOpenFile, maxDisplay = 5 }: RecentlyOpenedProps) {
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([])

  useEffect(() => {
    setRecentFiles(loadRecent())
  }, [])

  const removeFile = useCallback((path: string) => {
    const updated = recentFiles.filter((f) => f.path !== path)
    setRecentFiles(updated)
    saveRecent(updated)
  }, [recentFiles])

  const clearAll = useCallback(() => {
    setRecentFiles([])
    clearRecentFiles()
  }, [])

  const handleOpenFile = useCallback(
    (file: RecentFile) => {
      onOpenFile?.(file)
      if (window.electronAPI) {
        window.electronAPI.openPath(file.path)
      }
    },
    [onOpenFile]
  )

  if (recentFiles.length === 0) return null

  return (
    <div className="card p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold text-[rgb(var(--color-text))] flex items-center gap-1.5">
          <Clock size={14} className="text-astra-400" />
          Recently Opened
        </h3>
        <button onClick={clearAll} className="text-[10px] text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-text))]">
          Clear
        </button>
      </div>
      <div className="space-y-0.5">
        <AnimatePresence>
          {recentFiles.slice(0, maxDisplay).map((file) => (
            <motion.div
              key={file.path}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="group flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[rgb(var(--color-bg))] cursor-pointer"
              onClick={() => handleOpenFile(file)}
              role="button"
              tabIndex={0}
              aria-label={`Open ${file.name}`}
              onKeyDown={(e) => { if (e.key === 'Enter') handleOpenFile(file) }}
            >
              {getFileIcon(file.ext)}
              <span className="flex-1 text-xs text-[rgb(var(--color-text))] truncate">{file.name}</span>
              <span className="text-[10px] text-[rgb(var(--color-text-secondary))] opacity-0 group-hover:opacity-100 transition-opacity">
                {new Date(file.openedAt).toLocaleDateString()}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); removeFile(file.path) }}
                className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-red-500 transition-all"
                aria-label={`Remove ${file.name} from recent`}
              >
                <X size={12} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}

export type { RecentFile }
