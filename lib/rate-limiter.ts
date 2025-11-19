/**
 * Rate Limiting Utility
 *
 * Provides centralized rate limiting with database-backed storage
 * to prevent memory leaks and ensure persistence across server restarts.
 */

import { createClient } from '@/lib/supabase/server';

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  keyPrefix?: string;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export class RateLimiter {
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = {
      keyPrefix: 'rate_limit',
      ...config
    };
  }

  /**
   * Check if request should be allowed
   */
  async checkLimit(identifier: string, userId?: string): Promise<{ allowed: boolean; resetAt?: number; remaining?: number }> {
    try {
      const supabase = await createClient();
      const now = Date.now();
      const fullKey = userId ? `${userId}:${this.config.keyPrefix}:${identifier}` : `${this.config.keyPrefix}:${identifier}`;

      // Get current rate limit entry
      const { data: existing } = await supabase
        .from('rate_limits')
        .select('count, reset_at')
        .eq('key', fullKey)
        .maybeSingle();

      const resetAt = now + this.config.windowMs;

      if (!existing || now > existing.reset_at) {
        // Create new entry or reset expired one
        const { error } = await supabase
          .from('rate_limits')
          .upsert({
            key: fullKey,
            count: 1,
            reset_at: resetAt,
            created_at: new Date().toISOString()
          }, {
            onConflict: 'key'
          });

        if (error) {
          console.error('Rate limit upsert error:', error);
          return { allowed: true }; // Fail open on database errors
        }

        return {
          allowed: true,
          resetAt,
          remaining: this.config.maxRequests - 1
        };
      }

      // Check if limit exceeded
      if (existing.count >= this.config.maxRequests) {
        return {
          allowed: false,
          resetAt: existing.reset_at,
          remaining: 0
        };
      }

      // Increment count
      const newCount = existing.count + 1;
      const { error } = await supabase
        .from('rate_limits')
        .update({ count: newCount })
        .eq('key', fullKey);

      if (error) {
        console.error('Rate limit update error:', error);
        return { allowed: true }; // Fail open
      }

      return {
        allowed: true,
        resetAt: existing.reset_at,
        remaining: this.config.maxRequests - newCount
      };

    } catch (error) {
      console.error('Rate limiting error:', error);
      return { allowed: true }; // Fail open on any error
    }
  }

  /**
   * Get remaining requests for an identifier
   */
  async getRemaining(identifier: string): Promise<number> {
    try {
      const supabase = await createClient();
      const key = `${this.config.keyPrefix}:${identifier}`;

      const { data } = await supabase
        .from('rate_limits')
        .select('count, reset_at')
        .eq('key', key)
        .maybeSingle();

      if (!data || Date.now() > data.reset_at) {
        return this.config.maxRequests;
      }

      return Math.max(0, this.config.maxRequests - data.count);
    } catch (error) {
      console.error('Error getting remaining requests:', error);
      return this.config.maxRequests;
    }
  }
}

// Pre-configured rate limiters
export const measurementLimiter = new RateLimiter({
  maxRequests: 20,
  windowMs: 60 * 1000, // 1 minute
  keyPrefix: 'measurements'
});

export const workoutGenerationLimiter = new RateLimiter({
  maxRequests: 10,
  windowMs: 60 * 60 * 1000, // 1 hour
  keyPrefix: 'workout_generation'
});

export const analysisLimiter = new RateLimiter({
  maxRequests: 5,
  windowMs: 60 * 60 * 1000, // 1 hour
  keyPrefix: 'analysis'
});
