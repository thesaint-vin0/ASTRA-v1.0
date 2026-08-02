import { useState, useCallback, useRef } from 'react'

interface DragDropState {
  isDragging: boolean
  files: FileList | null
  dragCounter: number
}

interface UseDragDropOptions {
  onFilesDropped?: (files: FileList) => void
  accept?: string[]
}

export function useElectronDragDrop({ onFilesDropped, accept }: UseDragDropOptions = {}) {
  const [state, setState] = useState<DragDropState>({
    isDragging: false,
    files: null,
    dragCounter: 0,
  })
  const dragCounterRef = useRef(0)

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current += 1
    setState((prev) => ({ ...prev, isDragging: true }))
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current -= 1
    if (dragCounterRef.current === 0) {
      setState((prev) => ({ ...prev, isDragging: false }))
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      dragCounterRef.current = 0
      setState({ isDragging: false, files: null, dragCounter: 0 })

      const droppedFiles = e.dataTransfer.files

      // Filter by accept types if specified
      if (accept && accept.length > 0) {
        const validFiles = Array.from(droppedFiles).filter((file) => {
          const ext = '.' + file.name.split('.').pop()?.toLowerCase()
          return accept.some((a) => {
            if (a.startsWith('.')) return ext === a.toLowerCase()
            if (a.includes('/')) return file.type.match(a)
            return true
          })
        })
        if (validFiles.length > 0) {
          const dt = new DataTransfer()
          validFiles.forEach((f) => dt.items.add(f))
          const filteredList = dt.files
          setState((prev) => ({ ...prev, files: filteredList }))
          onFilesDropped?.(filteredList)
        }
      } else {
        setState((prev) => ({ ...prev, files: droppedFiles }))
        onFilesDropped?.(droppedFiles)
      }
    },
    [onFilesDropped, accept]
  )

  // Process dropped files through Electron IPC
  const processWithElectron = useCallback(
    async (filePaths: string[]) => {
      if (window.electronAPI) {
        try {
          const result = await window.electronAPI.processDroppedFiles(filePaths)
          if (result.success) {
            return result.files
          }
        } catch (err) {
          console.error('Failed to process files via Electron:', err)
        }
      }
      return null
    },
    []
  )

  // Keyboard-accessible counterpart to drag-and-drop: opens a native file
  // picker so keyboard-only users can import files without a mouse.
  const openFilePicker = useCallback(() => {
    if (window.electronAPI) {
      window.electronAPI
        .openFileDialog({ filters: [{ name: 'Supported Files', extensions: ['pdf', 'docx', 'xlsx', 'pptx', 'txt', 'md', 'png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'zip', 'json', 'csv', 'xml', 'yaml', 'yml'] }] })
        .then((result) => {
          if (!result.canceled && result.filePaths.length > 0) {
            // Simulate a FileList from the selected paths for unified handling
            const dt = new DataTransfer()
            result.filePaths.forEach((p) => {
              const name = p.split(/[\\/]/).pop() || p
              dt.items.add(new File([], name))
            })
            if (dt.files.length > 0) {
              setState((prev) => ({ ...prev, files: dt.files }))
              onFilesDropped?.(dt.files)
            }
          }
        })
        .catch((err) => console.error('Failed to open file picker:', err))
    }
  }, [onFilesDropped])

  return {
    isDragging: state.isDragging,
    files: state.files,
    dragHandlers: {
      onDragEnter: handleDragEnter,
      onDragLeave: handleDragLeave,
      onDragOver: handleDragOver,
      onDrop: handleDrop,
    },
    processWithElectron,
    openFilePicker,
  }
}
