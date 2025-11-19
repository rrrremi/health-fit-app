/**
 * Simple logger utility
 * Only logs in development mode
 */

const isDev = process.env.NODE_ENV === 'development';

export const logger = {
  /**
   * Log informational messages (only in development)
   */
  info: (...args: any[]) => {
    if (isDev) {
      console.log('[INFO]', ...args);
    }
  },

  /**
   * Log warnings (always shown)
   */
  warn: (...args: any[]) => {
    console.warn('[WARN]', ...args);
  },

  /**
   * Log errors (always shown)
   */
  error: (...args: any[]) => {
    console.error('[ERROR]', ...args);
  },

  /**
   * Log debug messages (only in development)
   */
  debug: (...args: any[]) => {
    if (isDev) {
      console.log('[DEBUG]', ...args);
    }
  },
};
