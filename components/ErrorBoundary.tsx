'use client'

import { Component, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';
import * as Sentry from '@sentry/nextjs';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

/**
 * Error Boundary Component
 * 
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI instead of crashing.
 * 
 * Usage:
 * ```tsx
 * <ErrorBoundary>
 *   <YourComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console
    console.error('Error Boundary caught an error:', error, errorInfo);

    // Store error info in state
    this.setState({ errorInfo });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Send to Sentry error tracking
    Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack,
        },
        error_boundary: {
          boundary_type: 'full_page',
          has_custom_fallback: !!this.props.fallback,
        },
      },
      tags: {
        error_boundary: 'full_page',
        component: 'ErrorBoundary',
      },
      user: {
        // Add user context if available
        // This would need to be passed down from auth context
      },
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-6 backdrop-blur-sm">
              {/* Icon */}
              <div className="flex justify-center mb-4">
                <div className="rounded-full bg-destructive/20 p-3">
                  <AlertCircle className="h-8 w-8 text-destructive" />
                </div>
              </div>

              {/* Title */}
              <h2 className="text-xl font-semibold text-foreground text-center mb-2">
                Something went wrong
              </h2>

              {/* Description */}
              <p className="text-sm text-muted-foreground text-center mb-4">
                We encountered an unexpected error. Don't worry, your data is safe.
              </p>

              {/* Error details (development only) */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="mb-4 p-3 rounded bg-card/30 border border-border">
                  <p className="text-xs font-mono text-destructive mb-1">
                    {this.state.error.name}: {this.state.error.message}
                  </p>
                  {this.state.errorInfo && (
                    <details className="mt-2">
                      <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                        Component Stack
                      </summary>
                      <pre className="text-[10px] text-muted-foreground mt-2 overflow-auto max-h-32">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </details>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col gap-2">
                <button
                  onClick={this.handleReset}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-destructive/20 px-4 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/30 transition-colors"
                >
                  <RefreshCw className="h-4 w-4" />
                  Try Again
                </button>

                <Link href="/protected/measurements">
                  <button className="w-full flex items-center justify-center gap-2 rounded-lg bg-muted px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted/80 transition-colors">
                    <Home className="h-4 w-4" />
                    Go to Home
                  </button>
                </Link>
              </div>

              {/* Help text */}
              <p className="text-xs text-muted-foreground text-center mt-4">
                If this problem persists, please contact support
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Lightweight Error Boundary for smaller components
 * Shows inline error message instead of full-page fallback
 */
export class InlineErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Inline Error Boundary caught an error:', error, errorInfo);

    // Send to Sentry error tracking
    Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack,
        },
        error_boundary: {
          boundary_type: 'inline',
        },
      },
      tags: {
        error_boundary: 'inline',
        component: 'InlineErrorBoundary',
      },
    });

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-destructive mb-1">
                Error loading component
              </h3>
              <p className="text-xs text-destructive/70 mb-3">
                {this.state.error?.message || 'An unexpected error occurred'}
              </p>
              <button
                onClick={this.handleReset}
                className="text-xs text-destructive hover:text-destructive/80 underline"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
