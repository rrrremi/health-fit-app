'use client'

import { useEffect } from 'react'
import { AlertCircle, RefreshCw, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import * as Sentry from '@sentry/nextjs'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

/**
 * Error boundary for workout detail page
 * Catches errors and provides recovery options
 */
export default function WorkoutDetailError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log to Sentry
    Sentry.captureException(error, {
      tags: {
        page: 'workout_detail',
        error_boundary: 'page_level',
      },
    })
  }, [error])

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-6 backdrop-blur-sm">
          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-red-500/20 p-3">
              <AlertCircle className="h-8 w-8 text-red-400" />
            </div>
          </div>

          {/* Title */}
          <h2 className="text-lg font-medium text-white/90 text-center mb-2">
            Unable to Load Workout
          </h2>

          {/* Message */}
          <p className="text-sm text-white/60 text-center mb-6">
            We encountered an error while loading this workout. This might be a temporary issue.
          </p>

          {/* Error details in dev */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mb-6 p-3 rounded bg-black/20 border border-white/10">
              <p className="text-xs font-mono text-red-300 break-all">
                {error.message}
              </p>
              {error.digest && (
                <p className="text-xs text-white/40 mt-1">
                  Digest: {error.digest}
                </p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <button
              onClick={reset}
              className="flex items-center justify-center gap-2 w-full px-4 py-2 rounded-md bg-white/10 hover:bg-white/20 text-white/90 text-sm font-medium transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </button>
            
            <Link
              href="/protected/workouts"
              className="flex items-center justify-center gap-2 w-full px-4 py-2 rounded-md border border-white/20 hover:bg-white/5 text-white/70 text-sm transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Workouts
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
