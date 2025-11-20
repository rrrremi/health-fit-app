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

  // Handle outside clicks
  useEffect(() => {
    if (!isOpen || !closeOnOutsideClick) return

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      const isOutsideTrigger = triggerRef.current && !triggerRef.current.contains(target)
      const isOutsidePortal = !target.closest('[data-portal-content]')

      if (isOutsideTrigger && isOutsidePortal) {
        onClose?.()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, closeOnOutsideClick, onClose, triggerRef])

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
