import { useEffect, useRef, useCallback, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export interface ContextMenuItem {
  id: string
  label: string
  icon?: React.ReactNode
  shortcut?: string
  disabled?: boolean
  divider?: boolean
  danger?: boolean
  onClick: () => void
  children?: ContextMenuItem[]
}

interface ContextMenuProps {
  items: ContextMenuItem[]
  triggerRef: React.RefObject<HTMLElement>
  onClose?: () => void
}

/**
 * Accessible context menu with full keyboard support:
 * - Arrow keys to move between items
 * - Home / End to jump to first/last item
 * - Enter/Space to activate
 * - Escape to close (submenu first, then root)
 * - Focus moves into the menu on open and returns to the trigger on close
 */
export default function ContextMenu({ items, triggerRef, onClose }: ContextMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null)
  const [focusedIndex, setFocusedIndex] = useState(0)
  const menuRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  const openMenu = useCallback(
    (e: MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      previousFocusRef.current = document.activeElement as HTMLElement | null
      const x = Math.min(e.clientX, window.innerWidth - 240)
      const y = Math.min(e.clientY, window.innerHeight - items.length * 36 - 16)
      setPosition({ x, y })
      setFocusedIndex(0)
      setIsOpen(true)
    },
    [items.length]
  )

  const closeMenu = useCallback(() => {
    setIsOpen(false)
    setActiveSubmenu(null)
    previousFocusRef.current?.focus?.()
    onClose?.()
  }, [onClose])

  const handleClickOutside = useCallback(
    (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setActiveSubmenu(null)
        previousFocusRef.current?.focus?.()
        onClose?.()
      }
    },
    [onClose]
  )

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        if (activeSubmenu) {
          setActiveSubmenu(null)
        } else {
          closeMenu()
        }
        return
      }

      if (!menuRef.current?.contains(document.activeElement)) return

      const menuItemButtons = Array.from(
        menuRef.current.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not([aria-disabled="true"])')
      )

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setFocusedIndex((prev) => {
            const next = (prev + 1) % Math.max(menuItemButtons.length, 1)
            menuItemButtons[next]?.focus()
            return next
          })
          break
        case 'ArrowUp':
          e.preventDefault()
          setFocusedIndex((prev) => {
            const next = (prev - 1 + Math.max(menuItemButtons.length, 1)) % Math.max(menuItemButtons.length, 1)
            menuItemButtons[next]?.focus()
            return next
          })
          break
        case 'Home':
          e.preventDefault()
          setFocusedIndex(0)
          menuItemButtons[0]?.focus()
          break
        case 'End':
          e.preventDefault()
          setFocusedIndex(Math.max(menuItemButtons.length - 1, 0))
          menuItemButtons[menuItemButtons.length - 1]?.focus()
          break
        default:
          break
      }
    },
    [activeSubmenu, closeMenu]
  )

  useEffect(() => {
    const trigger = triggerRef.current
    if (trigger) {
      trigger.addEventListener('contextmenu', openMenu)
      return () => trigger.removeEventListener('contextmenu', openMenu)
    }
  }, [triggerRef, openMenu])

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('click', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
      // Move focus to the first menu item shortly after opening
      const focusTimer = setTimeout(() => {
        menuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]:not([aria-disabled="true"])')?.focus()
      }, 30)
      return () => {
        document.removeEventListener('click', handleClickOutside)
        document.removeEventListener('keydown', handleKeyDown)
        clearTimeout(focusTimer)
      }
    }
  }, [isOpen, handleClickOutside, handleKeyDown])

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={menuRef}
          initial={{ opacity: 0, scale: 0.95, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -4 }}
          transition={{ duration: 0.1, ease: 'easeOut' }}
          className="fixed z-[300] min-w-[200px] py-1 rounded-xl border border-[rgb(var(--color-border))] shadow-2xl"
          style={{
            left: position.x,
            top: position.y,
            backgroundColor: 'rgb(var(--color-surface))',
          }}
          role="menu"
          aria-label="Context menu"
        >
          {items.map((item, index) => (
            <div key={item.id}>
              {item.divider && (
                <div className="my-1 border-t border-[rgb(var(--color-border))]" role="separator" />
              )}
              <button
                onClick={() => {
                  if (!item.disabled) {
                    item.onClick()
                    closeMenu()
                  }
                }}
                onMouseEnter={() => {
                  setFocusedIndex(index)
                  if (item.children) setActiveSubmenu(item.id)
                }}
                disabled={item.disabled}
                className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm transition-colors ${
                  item.danger
                    ? 'text-red-500 hover:bg-red-500/10'
                    : 'text-[rgb(var(--color-text))] hover:bg-[rgb(var(--color-bg))]'
                } ${
                  focusedIndex === index && !item.disabled && !item.danger
                    ? 'bg-[rgb(var(--color-bg))]'
                    : ''
                } ${item.disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                role="menuitem"
                aria-disabled={item.disabled}
                aria-selected={focusedIndex === index}
              >
                {item.icon && <span className="flex-shrink-0 w-4 h-4" aria-hidden="true">{item.icon}</span>}
                <span className="flex-1 text-left">{item.label}</span>
                {item.shortcut && (
                  <kbd className="text-[10px] px-1 py-0.5 rounded bg-[rgb(var(--color-bg))] text-[rgb(var(--color-text-secondary))]">
                    {item.shortcut}
                  </kbd>
                )}
                {item.children && (
                  <span className="text-[rgb(var(--color-text-secondary))]" aria-hidden="true">▸</span>
                )}
              </button>
              {/* Submenu */}
              {activeSubmenu === item.id && item.children && (
                <div
                  className="absolute left-full top-0 ml-1 min-w-[180px] py-1 rounded-xl border border-[rgb(var(--color-border))] shadow-lg"
                  style={{ backgroundColor: 'rgb(var(--color-surface))' }}
                  role="menu"
                  aria-label={item.label}
                >
                  {item.children.map((child) => (
                    <button
                      key={child.id}
                      onClick={() => {
                        child.onClick()
                        closeMenu()
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm transition-colors ${
                        child.danger
                          ? 'text-red-500 hover:bg-red-500/10'
                          : 'text-[rgb(var(--color-text))] hover:bg-[rgb(var(--color-bg))]'
                      }`}
                      role="menuitem"
                      aria-disabled={child.disabled ?? false}
                    >
                      {child.icon && <span className="flex-shrink-0 w-4 h-4" aria-hidden="true">{child.icon}</span>}
                      <span className="flex-1 text-left">{child.label}</span>
                      {child.shortcut && (
                        <kbd className="text-[10px] px-1 py-0.5 rounded bg-[rgb(var(--color-bg))] text-[rgb(var(--color-text-secondary))]">
                          {child.shortcut}
                        </kbd>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

