import { toast as sonnerToast } from 'sonner'

/**
 * Centralized toast configuration
 * Provides consistent, delicate toast notifications across the app
 * 
 * Features:
 * - 3.3 second duration (auto-close)
 * - Smooth animations
 * - Consistent styling
 * - No duplicate toasts for same message
 */

const TOAST_DURATION = 3300 // 3.3 seconds

// Track recent toasts to prevent duplicates
const recentToasts = new Map<string, number>()
const DEDUPE_WINDOW = 2000 // 2 seconds

function shouldShowToast(message: string): boolean {
  const now = Date.now()
  const lastShown = recentToasts.get(message)
  
  if (lastShown && now - lastShown < DEDUPE_WINDOW) {
    return false
  }
  
  recentToasts.set(message, now)
  
  // Clean up old entries
  if (recentToasts.size > 20) {
    const cutoff = now - DEDUPE_WINDOW
    recentToasts.forEach((time, key) => {
      if (time < cutoff) {
        recentToasts.delete(key)
      }
    })
  }
  
  return true
}

export const toast = {
  /**
   * Success toast - for completed actions
   */
  success: (message: string) => {
    if (!shouldShowToast(message)) return
    
    sonnerToast.success(message, {
      duration: TOAST_DURATION,
      className: 'toast-success',
    })
  },

  /**
   * Error toast - for failed actions
   */
  error: (message: string) => {
    if (!shouldShowToast(message)) return
    
    sonnerToast.error(message, {
      duration: TOAST_DURATION,
      className: 'toast-error',
    })
  },

  /**
   * Warning toast - for important notices
   */
  warning: (message: string) => {
    if (!shouldShowToast(message)) return
    
    sonnerToast.warning(message, {
      duration: TOAST_DURATION,
      className: 'toast-warning',
    })
  },

  /**
   * Info toast - for general information
   */
  info: (message: string) => {
    if (!shouldShowToast(message)) return
    
    sonnerToast.info(message, {
      duration: TOAST_DURATION,
      className: 'toast-info',
    })
  },

  /**
   * Loading toast - for async operations
   * Returns a function to dismiss the toast
   */
  loading: (message: string) => {
    const id = sonnerToast.loading(message, {
      duration: Infinity, // Don't auto-close loading toasts
      className: 'toast-loading',
    })
    
    return {
      dismiss: () => sonnerToast.dismiss(id),
      success: (successMessage: string) => {
        sonnerToast.success(successMessage, {
          id,
          duration: TOAST_DURATION,
        })
      },
      error: (errorMessage: string) => {
        sonnerToast.error(errorMessage, {
          id,
          duration: TOAST_DURATION,
        })
      },
    }
  },

  /**
   * Promise toast - for async operations with automatic success/error
   */
  promise: <T>(
    promise: Promise<T>,
    messages: {
      loading: string
      success: string
      error: string
    }
  ) => {
    return sonnerToast.promise(promise, {
      loading: messages.loading,
      success: messages.success,
      error: messages.error,
      duration: TOAST_DURATION,
    })
  },

  /**
   * Dismiss all toasts
   */
  dismiss: () => {
    sonnerToast.dismiss()
  },
}

// Re-export for convenience
export default toast
