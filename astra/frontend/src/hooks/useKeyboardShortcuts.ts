import { useEffect, useCallback } from 'react'

type KeyCombo = {
  key: string
  ctrl?: boolean
  meta?: boolean
  shift?: boolean
  alt?: boolean
}

type ShortcutHandler = () => void

interface Shortcut {
  combo: KeyCombo
  handler: ShortcutHandler
  description: string
  category: string
}

const registeredShortcuts: Shortcut[] = []

/**
 * Hook to register global keyboard shortcuts
 * Shortcuts are disabled when focus is in input/textarea elements
 */
export function useKeyboardShortcuts(shortcuts: Shortcut[]) {
  const isInputFocused = useCallback(() => {
    const tag = document.activeElement?.tagName?.toLowerCase()
    return tag === 'input' || tag === 'textarea' || tag === 'select' || (document.activeElement?.getAttribute('contenteditable') === 'true')
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip shortcuts when typing in inputs
      if (isInputFocused()) return

      for (const shortcut of shortcuts) {
        const { combo } = shortcut
        const matchKey = e.key.toLowerCase() === combo.key.toLowerCase()
        const matchCtrl = combo.ctrl ? (e.ctrlKey || e.metaKey) : !e.ctrlKey && !e.metaKey
        const matchShift = combo.shift ? e.shiftKey : !e.shiftKey
        const matchAlt = combo.alt ? e.altKey : !e.altKey

        if (matchKey && matchCtrl && matchShift && matchAlt) {
          e.preventDefault()
          shortcut.handler()
          return
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [shortcuts, isInputFocused])

  // Register for external access
  useEffect(() => {
    registeredShortcuts.length = 0
    registeredShortcuts.push(...shortcuts)
    return () => {
      registeredShortcuts.length = 0
    }
  }, [shortcuts])
}

/** Get all registered shortcuts for display */
export function getRegisteredShortcuts(): Shortcut[] {
  return [...registeredShortcuts]
}

/** Format a key combo for display */
export function formatKeyCombo(combo: KeyCombo): string {
  const parts: string[] = []
  if (combo.ctrl) parts.push('Ctrl')
  if (combo.meta) parts.push('⌘')
  if (combo.alt) parts.push('Alt')
  if (combo.shift) parts.push('Shift')
  parts.push(combo.key.charAt(0).toUpperCase() + combo.key.slice(1))
  return parts.join(' + ')
}

export type { Shortcut, KeyCombo }

