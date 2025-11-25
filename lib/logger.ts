/**
 * Simple logger utility
 * Controls logging based on environment
 */

const isDev = process.env.NODE_ENV === 'development';

export const logger = {
  /**
   * Log informational messages (only in development)
   */
  info: (...args: unknown[]) => {
    if (isDev) {
      console.log('[INFO]', ...args);
    }
  },

  /**
   * Log warnings (only in development for non-critical)
   */
  warn: (...args: unknown[]) => {
    if (isDev) {
      console.warn('[WARN]', ...args);
    }
  },

  /**
   * Log errors (only in development for expected errors, always for critical)
   */
  error: (...args: unknown[]) => {
    if (isDev) {
      console.error('[ERROR]', ...args);
    }
  },

  /**
   * Log critical errors (always shown - use sparingly)
   */
  critical: (...args: unknown[]) => {
    console.error('[CRITICAL]', ...args);
  },

  /**
   * Log debug messages (only in development)
   */
  debug: (...args: unknown[]) => {
    if (isDev) {
      console.log('[DEBUG]', ...args);
    }
  },
};
