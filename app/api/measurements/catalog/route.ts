import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch all metrics from catalog, ordered by sort_order
    const { data: metrics, error: metricsError } = await supabase
      .from('metrics_catalog')
      .select('key, display_name, unit, category, min_value, max_value')
      .order('category', { ascending: true })
      .order('sort_order', { ascending: true });

    if (metricsError) {
      console.error('Error fetching metrics catalog:', metricsError);
      return NextResponse.json(
        { error: 'Failed to fetch metrics catalog' },
        { status: 500 }
      );
    }

    // Transform for frontend consumption
    const formattedMetrics = metrics.map(metric => ({
      key: metric.key,
      display_name: metric.display_name,
      unit: metric.unit,
      category: metric.category,
      validation: {
        min: metric.min_value,
        max: metric.max_value
      }
    }));

    return NextResponse.json({
      success: true,
      metrics: formattedMetrics
    });

  } catch (error: any) {
    console.error('=== METRICS CATALOG ERROR ===');
    console.error('Error:', error);
    console.error('================================');

    return NextResponse.json(
      {
        error: error.message || 'Failed to fetch metrics catalog',
        code: error.code,
        type: error.type
      },
      { status: 500 }
    );
  }
}
