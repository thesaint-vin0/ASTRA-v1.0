import { useEffect, useRef } from 'react'

/**
 * Moves focus to the page heading on route changes so screen readers and
 * keyboard users know which page loaded. This is the recommended pattern for
 * accessible SPA navigation.
 */
export function useRouteFocus(): { ref: React.RefObject<HTMLHeadingElement> } {
  const ref = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    // Only move focus if the consumer hasn't deliberately set it elsewhere
    ref.current?.focus()
  }, [])

  return { ref }
}

export default useRouteFocus

