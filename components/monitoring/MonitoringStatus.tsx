'use client';

import React, { useState } from 'react';
import { Send, AlertTriangle, CheckCircle, Clock, Activity } from 'lucide-react';
import { MonitoringService } from '@/lib/monitoring';
import { isSentryEnabled, isProduction } from '@/lib/monitoring';

interface MonitoringStatusProps {
  className?: string;
}

export function MonitoringStatus({ className = '' }: MonitoringStatusProps) {
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackCategory, setFeedbackCategory] = useState('general');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!feedbackMessage.trim()) return;

    setIsSubmitting(true);

    try {
      MonitoringService.captureFeedback({
        message: feedbackMessage,
        category: feedbackCategory,
        metadata: {
          userAgent: navigator.userAgent,
          url: window.location.href,
          timestamp: new Date().toISOString(),
        },
      });

      setSubmitted(true);
      setFeedbackMessage('');
      setTimeout(() => setSubmitted(false), 3000);
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const monitoringStatus = isSentryEnabled ? 'active' : 'disabled';
  const environment = isProduction ? 'production' : 'development';

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Monitoring Status */}
      <div className="rounded-lg border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-white/90 flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Monitoring Status
          </h3>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded-full text-xs ${
              monitoringStatus === 'active'
                ? 'bg-green-500/20 text-green-300'
                : 'bg-yellow-500/20 text-yellow-300'
            }`}>
              {monitoringStatus}
            </span>
            <span className="px-2 py-0.5 rounded-full text-xs bg-blue-500/20 text-blue-300">
              {environment}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="flex items-center gap-2">
            {isSentryEnabled ? (
              <CheckCircle className="h-3 w-3 text-green-400" />
            ) : (
              <AlertTriangle className="h-3 w-3 text-yellow-400" />
            )}
            <span className="text-white/70">
              Error Tracking: {isSentryEnabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Clock className="h-3 w-3 text-blue-400" />
            <span className="text-white/70">
              Performance: {isSentryEnabled ? 'Monitored' : 'Not Monitored'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Activity className="h-3 w-3 text-purple-400" />
            <span className="text-white/70">
              Environment: {environment}
            </span>
          </div>
        </div>

        {!isSentryEnabled && (
          <div className="mt-3 p-2 rounded bg-yellow-500/10 border border-yellow-500/20">
            <p className="text-xs text-yellow-200">
              Monitoring is disabled. Configure SENTRY_DSN in your environment variables to enable error tracking and performance monitoring.
            </p>
          </div>
        )}
      </div>

      {/* User Feedback */}
      <div className="rounded-lg border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
        <h3 className="text-sm font-medium text-white/90 mb-3 flex items-center gap-2">
          <Send className="h-4 w-4" />
          Send Feedback
        </h3>

        <form onSubmit={handleSubmitFeedback} className="space-y-3">
          <div>
            <select
              value={feedbackCategory}
              onChange={(e) => setFeedbackCategory(e.target.value)}
              className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white/90 focus:border-white/40 focus:outline-none"
            >
              <option value="general">General Feedback</option>
              <option value="bug">Bug Report</option>
              <option value="feature">Feature Request</option>
              <option value="performance">Performance Issue</option>
              <option value="ui">UI/UX Feedback</option>
            </select>
          </div>

          <div>
            <textarea
              value={feedbackMessage}
              onChange={(e) => setFeedbackMessage(e.target.value)}
              placeholder="Share your thoughts, report issues, or suggest improvements..."
              rows={3}
              className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white/90 placeholder-white/40 focus:border-white/40 focus:outline-none resize-none"
              required
            />
          </div>

          <button
            type="submit"
            disabled={!feedbackMessage.trim() || isSubmitting}
            className="flex items-center gap-2 rounded-lg bg-blue-500/20 px-4 py-2 text-sm font-medium text-blue-300 hover:bg-blue-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-blue-300 border-t-transparent rounded-full" />
                Sending...
              </>
            ) : submitted ? (
              <>
                <CheckCircle className="h-4 w-4" />
                Sent!
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Send Feedback
              </>
            )}
          </button>
        </form>

        <p className="text-xs text-white/50 mt-2">
          Your feedback helps us improve the application. All submissions are anonymous unless you include contact information.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <button
          onClick={() => MonitoringService.trackUserAction('manual_error_test')}
          className="rounded-lg border border-orange-500/20 bg-orange-500/10 p-3 text-left hover:bg-orange-500/20 transition-colors"
        >
          <div className="text-sm font-medium text-orange-300">Test Error Monitoring</div>
          <div className="text-xs text-orange-200 mt-1">Trigger a test error to verify monitoring</div>
        </button>

        <button
          onClick={() => {
            const endMeasurement = MonitoringService.startMeasurement('manual_performance_test');
            setTimeout(() => {
              endMeasurement();
              alert('Performance measurement completed');
            }, 1000);
          }}
          className="rounded-lg border border-green-500/20 bg-green-500/10 p-3 text-left hover:bg-green-500/20 transition-colors"
        >
          <div className="text-sm font-medium text-green-300">Test Performance Monitoring</div>
          <div className="text-xs text-green-200 mt-1">Measure a 1-second operation</div>
        </button>
      </div>
    </div>
  );
}

export default MonitoringStatus;
