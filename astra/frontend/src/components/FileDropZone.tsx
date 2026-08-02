import { useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, File, Folder, X, Plus } from 'lucide-react'
import { useElectronDragDrop } from '../hooks/useElectronDragDrop'

interface FileDropZoneProps {
  onFilesAccepted?: (files: FileList) => void
  accept?: string[]
  label?: string
  className?: string
}

export default function FileDropZone({
  onFilesAccepted,
  accept = ['.pdf', '.docx', '.xlsx', '.pptx', '.txt', '.md', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.zip'],
  label = 'Drop files here to import into Astra',
  className = '',
}: FileDropZoneProps) {
  const { isDragging, files, dragHandlers, openFilePicker } = useElectronDragDrop({
    onFilesDropped: onFilesAccepted,
    accept,
  })

  const handleProcessAll = useCallback(async () => {
    if (files && window.electronAPI) {
      const filePaths = Array.from(files).map((f) => f.name)
      await window.electronAPI.processDroppedFiles(filePaths)
    }
  }, [files])

  return (
    <>
      {/* Drag overlay */}
      <AnimatePresence>
        {isDragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[999] flex items-center justify-center"
            {...dragHandlers}
            role="region"
            aria-label="File drop zone"
            aria-dropeffect="copy"
          >
            <div className="absolute inset-0 bg-astra-600/10 backdrop-blur-sm" />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative flex flex-col items-center gap-4 p-12 rounded-2xl border-2 border-dashed border-astra-500 bg-[rgb(var(--color-surface))] shadow-2xl"
            >
              <div className="w-16 h-16 rounded-full bg-astra-500/10 flex items-center justify-center">
                <Upload size={32} className="text-astra-400" />
              </div>
              <p className="text-lg font-semibold text-[rgb(var(--color-text))]">{label}</p>
              <p className="text-sm text-[rgb(var(--color-text-secondary))]">
                Supported: PDF, DOCX, XLSX, PPTX, TXT, MD, Images, ZIP, and more
              </p>
              <div className="flex items-center gap-2 text-xs text-[rgb(var(--color-text-secondary))]">
                <File size={12} />
                <span>Files will be automatically imported</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Always-available keyboard-accessible import trigger */}
      {!isDragging && !files && (
        <button
          type="button"
          onClick={openFilePicker}
          className="fixed bottom-4 left-44 z-40 p-2 rounded-lg bg-[rgb(var(--color-surface))] border border-[rgb(var(--color-border))] shadow-lg hover:bg-[rgb(var(--color-surface-hover))] transition-all"
          aria-label="Import files using file picker"
          title="Import files"
        >
          <Plus size={16} />
        </button>
      )}

      {/* Dropped files summary */}
      {files && files.length > 0 && !isDragging && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`card p-3 ${className}`}
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Folder size={16} className="text-astra-400" />
              <span className="text-sm text-[rgb(var(--color-text))]">
                {files.length} file{files.length !== 1 ? 's' : ''} dropped
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleProcessAll} className="btn-primary text-xs py-1">
                Import All
              </button>
              <button
                onClick={() => window.location.reload()}
                className="btn-ghost p-1 text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-text))]"
                aria-label="Dismiss"
              >
                <X size={14} />
              </button>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {Array.from(files).slice(0, 5).map((file, i) => (
              <span key={i} className="tag text-[10px]">
                {file.name.length > 20 ? file.name.slice(0, 20) + '...' : file.name}
              </span>
            ))}
            {files.length > 5 && (
              <span className="tag text-[10px]">+{files.length - 5} more</span>
            )}
          </div>
        </motion.div>
      )}
    </>
  )
}
