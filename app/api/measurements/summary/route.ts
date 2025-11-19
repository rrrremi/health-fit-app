import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cacheHelper, cacheKeys, cacheTTL } from '@/lib/cache';
import type { MetricSummary } from '@/types/measurements';
import { calculateHealthStatus } from '@/lib/health-status';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    // Input validation: Check authentication
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Input validation: Verify user ID format
    if (!user.id || typeof user.id !== 'string') {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    const startTime = Date.now();
    
    // Try to get from cache first
    const cacheKey = cacheKeys.measurementsSummary(user.id);
    const cachedData = await cacheHelper.getOrSet(
      cacheKey,
      async () => {
        // Single optimized query with catalog JOIN (no N+1!)
        const { data, error } = await supabase.rpc('get_measurements_summary', {
          p_user_id: user.id
        });

        if (error) {
          logger.error('Database error:', error);
          throw error;
        }

        // Transform data - display_name and category now come from RPC function
        const metrics: MetricSummary[] = (data || []).map((row: any) => {
          const healthStatus = calculateHealthStatus(row.latest_value, {
            healthyMin: row.healthy_min_male,
            healthyMax: row.healthy_max_male,
            validationMin: row.min_value,
            validationMax: row.max_value
          });
          
          return {
            metric: row.metric,
            display_name: row.display_name || row.metric.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
            category: row.category || 'other',
            latest_value: row.latest_value,
            unit: row.unit,
            latest_date: row.latest_date,
            source: row.source,
            confidence: row.confidence,
            sparkline_points: row.sparkline_points || [],
            point_count: row.point_count || 0,
            change_pct: row.change_pct ?? null,
            trend_direction: row.trend_direction || 'insufficient',
            min_value: row.min_value ?? null,
            max_value: row.max_value ?? null,
            healthy_min_male: row.healthy_min_male ?? null,
            healthy_max_male: row.healthy_max_male ?? null,
            healthy_min_female: row.healthy_min_female ?? null,
            healthy_max_female: row.healthy_max_female ?? null,
            health_status: healthStatus
          };
        });

        return metrics;
      },
      cacheTTL.SHORT // 1 minute cache (faster updates)
    );

    const queryTime = Date.now() - startTime;
    logger.debug(`Measurements summary query: ${queryTime}ms, ${cachedData.length} metrics`);

    return NextResponse.json({
      metrics: cachedData,
      // Only include query time in development
      ...(process.env.NODE_ENV === 'development' && { query_time_ms: queryTime })
    });

  } catch (error: any) {
    logger.error('Error fetching measurements summary:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
