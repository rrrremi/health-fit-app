import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cacheHelper, cacheKeys, cacheTTL } from '@/lib/cache';
import type { MeasurementPublic } from '@/types/measurements';
import { calculateHealthStatus } from '@/lib/health-status';
import type { MeasurementDetailResponse, ApiError } from '@/types/api';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { name: string } }
) {
  const startTime = Date.now();
  
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' } satisfies ApiError, { status: 401 });
    }

    const metric = params.name;

    // Fetch all data in parallel for better performance
    const [measurementResult, trendResult, catalogResult] = await Promise.all([
      // Fetch measurements with delta/trend metadata via RPC
      supabase.rpc('get_measurement_detail', {
        p_user_id: user.id,
        p_metric: metric
      }),
      
      // Fetch aggregated trend summary if available
      supabase
        .from('measurement_trends')
        .select('delta_pct, delta_abs, slope_per_day, direction, computed_at')
        .eq('user_id', user.id)
        .eq('metric', metric)
        .maybeSingle(),
      
      // Get metric display name and range data from catalog
      supabase
        .from('metrics_catalog')
        .select('display_name, min_value, max_value, healthy_min_male, healthy_max_male, healthy_min_female, healthy_max_female')
        .eq('key', metric)
        .maybeSingle()
    ]);

    const { data: measurementRows, error } = measurementResult;
    const { data: trendRow } = trendResult;
    const { data: catalogData } = catalogResult;

    if (error) {
      logger.error('Database error:', error);
      return NextResponse.json({ error: error.message } satisfies ApiError, { status: 500 });
    }

    const displayName = catalogData?.display_name || 
      metric.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());

    // Health status calculation using shared utility

    const rangeData = catalogData ? {
      min_value: catalogData.min_value,
      max_value: catalogData.max_value
    } : null;

    const healthyRangeData = catalogData ? {
      min_male: catalogData.healthy_min_male,
      max_male: catalogData.healthy_max_male,
      min_female: catalogData.healthy_min_female,
      max_female: catalogData.healthy_max_female
    } : null;

    const measurements: MeasurementPublic[] = (measurementRows || []).map((row: any) => {
      const healthStatus = calculateHealthStatus(row.value, {
        healthyMin: catalogData?.healthy_min_male ?? null,
        healthyMax: catalogData?.healthy_max_male ?? null,
        validationMin: catalogData?.min_value ?? null,
        validationMax: catalogData?.max_value ?? null
      });
      
      return {
        id: row.id,
        metric,
        value: row.value,
        unit: row.unit,
        measured_at: row.measured_at,
        source: row.source,
        confidence: row.confidence,
        notes: row.notes,
        image_url: null,
        created_at: row.created_at,
        updated_at: row.updated_at,
        delta_abs: row.delta_abs,
        delta_pct: row.delta_pct,
        trend_direction: row.trend_direction,
        health_status: healthStatus
      };
    });

    const queryTime = Date.now() - startTime;
    console.log(`Metric detail query: ${queryTime}ms, ${measurements.length} measurements`);

    return NextResponse.json({
      metric,
      display_name: displayName,
      measurements,
      range: rangeData,
      healthy_range: healthyRangeData,
      trend_summary: trendRow
        ? {
            change_pct: trendRow.delta_pct,
            delta_abs: trendRow.delta_abs,
            slope_per_day: trendRow.slope_per_day,
            direction: trendRow.direction,
            computed_at: trendRow.computed_at
          }
        : undefined,
      query_time_ms: queryTime
    });

  } catch (error: any) {
    logger.error('Error fetching metric detail:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' } satisfies ApiError,
      { status: 500 }
    );
  }
}
