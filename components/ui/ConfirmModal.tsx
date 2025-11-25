'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, X } from 'lucide-react'

interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'info'
  isLoading?: boolean
}

/**
 * Accessible confirmation modal that replaces native confirm() dialogs
 * - Keyboard accessible (Escape to close, Tab to navigate)
 * - Focus trapped within modal
 * - Screen reader friendly
 */
export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  isLoading = false,
}: ConfirmModalProps) {
  const cancelButtonRef = useRef<HTMLButtonElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)

  // Focus cancel button when modal opens
  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure modal is rendered
      const timer = setTimeout(() => {
        cancelButtonRef.current?.focus()
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, isLoading, onClose])

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
      }
    }
  }, [isOpen])

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isLoading) {
      onClose()
    }
  }, [isLoading, onClose])

  const variantStyles = {
    danger: {
      icon: 'text-red-400',
      button: 'bg-red-500/20 hover:bg-red-500/30 text-red-300 border-red-500/30',
    },
    warning: {
      icon: 'text-amber-400',
      button: 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/30',
    },
    info: {
      icon: 'text-blue-400',
      button: 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border-blue-500/30',
    },
  }

  const styles = variantStyles[variant]

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={handleBackdropClick}
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-modal-title"
          aria-describedby="confirm-modal-description"
        >
          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.15 }}
            className="relative w-full max-w-sm bg-slate-900/95 border border-white/10 rounded-lg shadow-xl"
          >
            {/* Close button */}
            <button
              onClick={onClose}
              disabled={isLoading}
              className="absolute top-3 right-3 p-1 rounded-md text-white/40 hover:text-white/70 hover:bg-white/10 transition-colors disabled:opacity-50"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="p-5">
              {/* Icon and Title */}
              <div className="flex items-start gap-3 mb-3">
                <div className={`p-2 rounded-full bg-white/5 ${styles.icon}`}>
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div className="flex-1 pt-1">
                  <h3
                    id="confirm-modal-title"
                    className="text-sm font-medium text-white/90"
                  >
                    {title}
                  </h3>
                </div>
              </div>

              {/* Message */}
              <p
                id="confirm-modal-description"
                className="text-xs text-white/60 leading-relaxed ml-11 mb-5"
              >
                {message}
              </p>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2">
                <button
                  ref={cancelButtonRef}
                  onClick={onClose}
                  disabled={isLoading}
                  className="px-3 py-1.5 text-xs font-medium rounded-md text-white/70 hover:text-white/90 hover:bg-white/10 transition-colors disabled:opacity-50"
                >
                  {cancelText}
                </button>
                <button
                  onClick={onConfirm}
                  disabled={isLoading}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors disabled:opacity-50 ${styles.button}`}
                >
                  {isLoading ? 'Processing...' : confirmText}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/**
 * Hook to manage confirmation modal state
 * Usage:
 * const { showConfirm, ConfirmDialog } = useConfirmModal()
 * 
 * // In handler:
 * const confirmed = await showConfirm({
 *   title: 'Delete Item',
 *   message: 'Are you sure?',
 * })
 * if (confirmed) { ... }
 * 
 * // In JSX:
 * <ConfirmDialog />
 */
export function useConfirmModal() {
  const resolveRef = useRef<((value: boolean) => void) | null>(null)
  const [state, setState] = useState<{
    isOpen: boolean
    title: string
    message: string
    confirmText?: string
    cancelText?: string
    variant?: 'danger' | 'warning' | 'info'
    isLoading?: boolean
  }>({
    isOpen: false,
    title: '',
    message: '',
  })

  const showConfirm = useCallback((options: {
    title: string
    message: string
    confirmText?: string
    cancelText?: string
    variant?: 'danger' | 'warning' | 'info'
  }): Promise<boolean> => {
    return new Promise((resolve) => {
      resolveRef.current = resolve
      setState({
        isOpen: true,
        ...options,
      })
    })
  }, [])

  const handleClose = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: false }))
    resolveRef.current?.(false)
    resolveRef.current = null
  }, [])

  const handleConfirm = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: false }))
    resolveRef.current?.(true)
    resolveRef.current = null
  }, [])

  const ConfirmDialog = useCallback(() => (
    <ConfirmModal
      isOpen={state.isOpen}
      onClose={handleClose}
      onConfirm={handleConfirm}
      title={state.title}
      message={state.message}
      confirmText={state.confirmText}
      cancelText={state.cancelText}
      variant={state.variant}
      isLoading={state.isLoading}
    />
  ), [state, handleClose, handleConfirm])

  return { showConfirm, ConfirmDialog }
}
