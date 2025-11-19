// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

const SENTRY_DSN = process.env.SENTRY_DSN;
const SENTRY_ENVIRONMENT = process.env.SENTRY_ENVIRONMENT || 'development';

// Only initialize Sentry if DSN is provided
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,

    // Performance Monitoring
    tracesSampleRate: SENTRY_ENVIRONMENT === 'production' ? 0.1 : 1.0,

    // Release Health
    environment: SENTRY_ENVIRONMENT,

    integrations: [
      // HTTP integration for server-side API monitoring
      new Sentry.HttpIntegration({
        tracingOrigins: ["localhost", "yourdomain.com"],
        shouldCreateTransactionForRequest: (url) => {
          // Monitor external API calls
          return url.includes('openai') ||
                 url.includes('supabase') ||
                 url.includes('external-api');
        },
      }),
    ],

    // Filter server-side errors
    beforeSend(event, hint) {
      // Don't send events in development unless explicitly configured
      if (SENTRY_ENVIRONMENT === 'development' && !process.env.SENTRY_DEV_MODE) {
        return null;
      }

      // Filter out common non-actionable server errors
      if (event.exception) {
        const error = hint.originalException;
        if (error && typeof error === 'object' && 'message' in error) {
          const message = String(error.message);

          // Filter out expected auth errors
          if (message.includes('JWT') || message.includes('Unauthorized')) {
            return null;
          }

          // Filter out database connection errors (temporary)
          if (message.includes('connection') && message.includes('timeout')) {
            return null;
          }
        }
      }

      return event;
    },

    // Ignore common server errors
    ignoreErrors: [
      'JWT expired',
      'Token invalid',
      'Authentication failed',
      'Database connection timeout',
      'ECONNRESET',
      'EPIPE',
      'ENOTFOUND',
    ],
  });
}
