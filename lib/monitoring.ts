/**
 * Monitoring Utilities
 *
 * Centralized monitoring and observability for the application
 * Provides error tracking, performance monitoring, and user feedback
 */

import * as Sentry from '@sentry/nextjs';
import React from 'react';
import { InlineErrorBoundary } from '@/components/ErrorBoundary';

// Types for monitoring events
export interface MonitoringEvent {
  category: 'error' | 'performance' | 'user_action' | 'api_call';
  action: string;
  label?: string;
  value?: number;
  metadata?: Record<string, any>;
}

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count';
  tags?: Record<string, string>;
}

/**
 * Error Monitoring
 */
export class MonitoringService {
  /**
   * Capture and report errors to monitoring service
   */
  static captureError(error: Error | string, context?: Record<string, any>, tags?: Record<string, string>) {
    const errorObj = typeof error === 'string' ? new Error(error) : error;

    Sentry.captureException(errorObj, {
      contexts: context ? { custom: context } : undefined,
      tags: {
        service: 'health-tracker',
        ...tags,
      },
    });
  }

  /**
   * Capture user feedback
   */
  static captureFeedback(feedback: {
    message: string;
    email?: string;
    name?: string;
    category?: string;
    metadata?: Record<string, any>;
  }) {
    Sentry.captureMessage(`User Feedback: ${feedback.message}`, {
      level: 'info',
      contexts: {
        feedback: {
          email: feedback.email,
          name: feedback.name,
          category: feedback.category || 'general',
          ...feedback.metadata,
        },
      },
      tags: {
        type: 'user_feedback',
        category: feedback.category || 'general',
      },
    });
  }

  /**
   * Track custom events
   */
  static trackEvent(event: MonitoringEvent) {
    // Use Sentry's breadcrumb system for custom events
    Sentry.addBreadcrumb({
      category: event.category,
      message: event.action,
      level: 'info',
      data: {
        label: event.label,
        value: event.value,
        ...event.metadata,
      },
    });
  }

  /**
   * Track performance metrics
   */
  static trackPerformance(metric: PerformanceMetric) {
    // Use breadcrumbs for performance tracking since metrics API isn't available
    Sentry.addBreadcrumb({
      category: 'performance',
      message: `Performance: ${metric.name}`,
      level: 'info',
      data: {
        value: metric.value,
        unit: metric.unit,
        tags: metric.tags,
      },
    });

    // Also capture as a message for more visibility
    Sentry.captureMessage(`Performance: ${metric.name} = ${metric.value}${metric.unit}`, {
      level: 'info',
      tags: {
        type: 'performance',
        unit: metric.unit,
        ...metric.tags,
      },
    });
  }

  /**
   * Start performance measurement
   */
  static startMeasurement(name: string): () => void {
    const startTime = performance.now();

    return () => {
      const duration = performance.now() - startTime;
      this.trackPerformance({
        name,
        value: duration,
        unit: 'ms',
        tags: { type: 'measurement' },
      });
    };
  }

  /**
   * Track API calls
   */
  static trackApiCall(endpoint: string, method: string, statusCode: number, duration: number) {
    this.trackEvent({
      category: 'api_call',
      action: `${method} ${endpoint}`,
      value: duration,
      metadata: {
        status_code: statusCode,
        duration_ms: duration,
      },
    });

    // Track slow API calls
    if (duration > 3000) { // 3 seconds
      this.captureError(
        new Error(`Slow API call: ${method} ${endpoint} took ${duration}ms`),
        {
          endpoint,
          method,
          statusCode,
          duration,
        },
        {
          type: 'slow_api_call',
          severity: 'warning',
        }
      );
    }
  }

  /**
   * Track user actions
   */
  static trackUserAction(action: string, properties?: Record<string, any>) {
    this.trackEvent({
      category: 'user_action',
      action,
      metadata: properties,
    });
  }

  /**
   * Set user context for monitoring
   */
  static setUser(user: { id: string; email?: string; username?: string }) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.username,
    });
  }

  /**
   * Set additional context
   */
  static setContext(key: string, context: Record<string, any>) {
    Sentry.setContext(key, context);
  }

  /**
   * Clear user context
   */
  static clearUser() {
    Sentry.setUser(null);
  }
}

/**
 * React Hook for performance monitoring
 */
export function usePerformanceMonitoring(componentName: string) {
  const startMeasurement = MonitoringService.startMeasurement;

  const measureRender = startMeasurement(`${componentName}.render`);
  const measureEffect = (effectName: string) => startMeasurement(`${componentName}.${effectName}`);

  // Auto-measure component mount
  React.useEffect(() => {
    const endMeasurement = startMeasurement(`${componentName}.mount`);
    return endMeasurement;
  }, []);

  return {
    measureRender,
    measureEffect,
    measureAsync: (name: string, promise: Promise<any>) => {
      const endMeasurement = startMeasurement(`${componentName}.${name}`);
      promise.finally(endMeasurement);
      return promise;
    },
  };
}

/**
 * Higher-order component for error boundary monitoring
 * Note: This should be used in React components, not in utility files
 */
export function withMonitoring<P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
) {
  // Return a function that can be used to create a monitored component
  return function MonitoredComponent(props: P) {
    return React.createElement(InlineErrorBoundary, {
      onError: (error: Error, errorInfo: React.ErrorInfo) => {
        MonitoringService.captureError(error, {
          component: componentName,
          componentStack: errorInfo.componentStack,
          props: JSON.stringify(props),
        }, {
          component: componentName,
          error_type: 'react_error',
        });
      },
      children: React.createElement(Component, props)
    });
  };
}

/**
 * API monitoring wrapper
 */
export function withApiMonitoring<T extends any[]>(
  apiFunction: (...args: T) => Promise<any>,
  endpoint: string
): (...args: T) => Promise<any> {
  return async (...args: T) => {
    const startTime = performance.now();

    try {
      const result = await apiFunction(...args);
      const duration = performance.now() - startTime;

      MonitoringService.trackApiCall(endpoint, 'GET', 200, duration);

      return result;
    } catch (error: any) {
      const duration = performance.now() - startTime;
      const statusCode = error?.status || error?.statusCode || 500;

      MonitoringService.trackApiCall(endpoint, 'GET', statusCode, duration);
      MonitoringService.captureError(error, {
        endpoint,
        args: JSON.stringify(args),
        duration,
      }, {
        type: 'api_error',
        endpoint,
      });

      throw error;
    }
  };
}

/**
 * Environment detection for monitoring
 */
export const isProduction = process.env.NODE_ENV === 'production';
export const isDevelopment = process.env.NODE_ENV === 'development';
export const isSentryEnabled = !!(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN);

// Export default service
export default MonitoringService;
