import * as Sentry from "@sentry/nextjs";

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;
const SENTRY_ENVIRONMENT = process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || 'development';

// Only initialize Sentry if DSN is provided
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,

    // Performance Monitoring
    tracesSampleRate: SENTRY_ENVIRONMENT === 'production' ? 0.1 : 1.0,
    profilesSampleRate: SENTRY_ENVIRONMENT === 'production' ? 0.1 : 1.0,

    // Release Health
    environment: SENTRY_ENVIRONMENT,

    // Sampling for replays
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate: SENTRY_ENVIRONMENT === 'production' ? 0.1 : 0.1,

    // Set sampling rate for profiling - this is relative to tracesSampleRate
    profilesSampleRate: 1.0,

    integrations: [
      // Performance monitoring
      new Sentry.BrowserTracing({
        tracePropagationTargets: ["localhost", /^https:\/\/yourdomain\.com/],
      }),

      // Session replay
      new Sentry.Replay({
        maskAllText: true,
        blockAllMedia: true,
      }),

      // HTTP integration for API monitoring
      new Sentry.HttpIntegration({
        tracingOrigins: ["localhost", "yourdomain.com"],
        shouldCreateTransactionForRequest: (url) => {
          // Monitor API calls
          return url.includes('/api/') ||
                 url.includes('supabase') ||
                 url.includes('openai');
        },
      }),
    ],

    // Filter out development errors in production
    beforeSend(event, hint) {
      // Don't send events in development unless explicitly configured
      if (SENTRY_ENVIRONMENT === 'development' && !process.env.SENTRY_DEV_MODE) {
        return null;
      }

      // Filter out common non-actionable errors
      if (event.exception) {
        const error = hint.originalException;
        if (error && typeof error === 'object' && 'message' in error) {
          const message = String(error.message);

          // Filter out network errors that are expected
          if (message.includes('Network request failed') ||
              message.includes('Failed to fetch') ||
              message.includes('Load failed')) {
            return null;
          }

          // Filter out auth errors (handled separately)
          if (message.includes('JWT') || message.includes('Unauthorized')) {
            return null;
          }
        }
      }

      return event;
    },

    // Ignore errors from external scripts and browser extensions
    ignoreErrors: [
      'Non-Error promise rejection captured',
      'Loading chunk',
      'Loading CSS chunk',
      'Script error',
      'Network Error',
      /^chrome-extension:\/\//,
      /^moz-extension:\/\//,
      /^safari-extension:\/\//,
    ],

    // Capture console errors in production
    beforeBreadcrumb(breadcrumb, hint) {
      // Don't capture console logs in production to reduce noise
      if (breadcrumb.category === 'console' && SENTRY_ENVIRONMENT === 'production') {
        return null;
      }

      // Capture API errors
      if (breadcrumb.category === 'xhr' || breadcrumb.category === 'fetch') {
        if (hint && 'status_code' in hint && hint.status_code >= 400) {
          breadcrumb.level = 'error';
        }
      }

      return breadcrumb;
    },
  });
}

export default Sentry;
