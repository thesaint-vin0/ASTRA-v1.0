import { useEffect, useRef, type RefObject } from 'react'

/**
 * Traps keyboard focus within a container element (for modals/dialogs).
 *
 * - On activation, stores the currently focused element so focus can be restored
 *   when the trap is released (returns focus to the trigger).
 * - Cycles Tab / Shift+Tab between focusable elements inside the container.
 * - Returns a ref to attach to the container and a release function.
 */
export function useFocusTrap(
  active: boolean,
  restoreFocusOnDeactivate = true
): { trapRef: RefObject<HTMLDivElement>; release: () => void } {
  const trapRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!active) return
    previousFocusRef.current = document.activeElement as HTMLElement | null

    const container = trapRef.current
    // Focus the first focusable element once the dialog opens
    const focusables = container?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
    )
    focusables?.[0]?.focus()

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      if (!container) return

      const items = Array.from(
        container.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => el.offsetParent !== null)

      if (items.length === 0) {
        e.preventDefault()
        return
      }

      const first = items[0]
      const last = items[items.length - 1]
      const activeEl = document.activeElement

      if (e.shiftKey) {
        if (activeEl === first || !container.contains(activeEl)) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (activeEl === last || !container.contains(activeEl)) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      if (restoreFocusOnDeactivate) {
        previousFocusRef.current?.focus?.()
      }
    }
  }, [active, restoreFocusOnDeactivate])

  return {
    trapRef,
    release: () => {
      if (restoreFocusOnDeactivate) {
        previousFocusRef.current?.focus?.()
      }
    },
  }
}

export default useFocusTrap

