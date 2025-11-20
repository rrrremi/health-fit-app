import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'

interface PortalProps {
  children: React.ReactNode
  isOpen: boolean
  onClose?: () => void
  triggerRef: React.RefObject<HTMLElement>
  className?: string
  closeOnOutsideClick?: boolean
  closeOnEscape?: boolean
}

/**
 * Reusable Portal component for rendering floating UI elements outside container boundaries
 * Prevents clipping by overflow-hidden containers
 *
 * Usage:
 * const triggerRef = useRef<HTMLButtonElement>(null)
 * const [isOpen, setIsOpen] = useState(false)
 *
 * <button ref={triggerRef} onClick={() => setIsOpen(true)}>Open</button>
 * <Portal isOpen={isOpen} triggerRef={triggerRef} onClose={() => setIsOpen(false)}>
 *   <div>Your floating content</div>
 * </Portal>
 */
export default function Portal({
  children,
  isOpen,
  onClose,
  triggerRef,
  className = '',
  closeOnOutsideClick = true,
  closeOnEscape = true
}: PortalProps) {
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 })

  // Calculate position when portal opens
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const updatePosition = () => {
        const rect = triggerRef.current!.getBoundingClientRect()
        setPosition({
          top: rect.bottom + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width
        })
      }

      updatePosition()

      // Update position on scroll/resize
      const handleUpdate = () => updatePosition()
      window.addEventListener('scroll', handleUpdate, true)
      window.addEventListener('resize', handleUpdate)

      return () => {
        window.removeEventListener('scroll', handleUpdate, true)
        window.removeEventListener('resize', handleUpdate)
      }
    }
  }, [isOpen, triggerRef])

  // Handle escape key
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose?.()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, closeOnEscape, onClose])

  // Handle touch events to prevent page scrolling when scrolling inside portal
  useEffect(() => {
    if (!isOpen) return

    let isScrolling = false
    let startY = 0
    let startX = 0

    const handleTouchStart = (e: TouchEvent) => {
      const target = e.target as Element
      const portalContent = target.closest('[data-portal-content]')

      if (portalContent) {
        isScrolling = false
        startY = e.touches[0].clientY
        startX = e.touches[0].clientX

        // Check if the target is scrollable
        const scrollableElement = target.closest('[data-scrollable]')
        if (scrollableElement) {
          const element = scrollableElement as HTMLElement
          const canScrollVertically = element.scrollHeight > element.clientHeight
          const canScrollHorizontally = element.scrollWidth > element.clientWidth

          if (canScrollVertically || canScrollHorizontally) {
            isScrolling = true
          }
        }
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!isScrolling) return

      const deltaY = Math.abs(e.touches[0].clientY - startY)
      const deltaX = Math.abs(e.touches[0].clientX - startX)

      // If scrolling vertically more than horizontally, prevent page scroll
      if (deltaY > deltaX) {
        e.preventDefault()
        e.stopPropagation()
      }
    }

    const handleTouchEnd = () => {
      isScrolling = false
    }

    // Add touch listeners to document to catch all touch events
    document.addEventListener('touchstart', handleTouchStart, { passive: false })
    document.addEventListener('touchmove', handleTouchMove, { passive: false })
    document.addEventListener('touchend', handleTouchEnd, { passive: false })

    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [isOpen])

  if (!isOpen) return null

  return createPortal(
    <div
      data-portal-content
      className={`fixed z-[9999] ${className}`}
      style={{
        top: position.top,
        left: position.left,
        width: position.width,
        pointerEvents: 'auto'
      }}
    >
      {children}
    </div>,
    document.body
  )
}

/**
 * Hook for managing portal state and positioning
 */
export function usePortal() {
  const [isOpen, setIsOpen] = useState(false)
  const triggerRef = useRef<HTMLElement>(null)

  const open = () => setIsOpen(true)
  const close = () => setIsOpen(false)
  const toggle = () => setIsOpen(prev => !prev)

  return {
    isOpen,
    triggerRef,
    open,
    close,
    toggle
  }
}
