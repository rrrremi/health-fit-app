import * as Sentry from "@sentry/nextjs";

/**
 * Next.js instrumentation file
 * Runs once when the server starts
 * Perfect place for environment validation and monitoring setup
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Initialize Sentry server-side monitoring
    await import('./lib/sentry.server.config.js');

    // Import and run environment validation
    await import('./lib/env-validation');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    // Initialize Sentry for edge runtime
    await import('./lib/sentry.server.config.js');
  }
}

export const onRequestError = Sentry.captureRequestError;
