import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// GET /api/admin/metrics - Get all metrics catalog
export async function GET() {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin (you may want to create an admins table or use a role system)
    // For now, we'll check if user email is in a hardcoded list or has admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdmin = profile?.role === 'admin' ||
                   user.email === 'admin@example.com' || // Replace with your admin emails
                   false; // Add more admin checks here

    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get all metrics catalog
    const { data: metrics, error } = await supabase
      .from('metrics_catalog')
      .select('*')
      .order('category', { ascending: true })
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ metrics });

  } catch (error: any) {
    console.error('Error fetching metrics catalog:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/metrics/[key] - Update a metric's healthy ranges
export async function PATCH(
  request: Request,
  { params }: { params: { key: string } }
) {
  try {
    const supabase = await createClient();
    const metricKey = params.key;

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin access
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdmin = profile?.role === 'admin' ||
                   user.email === 'admin@example.com' ||
                   false;

    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const {
      healthy_min_male,
      healthy_max_male,
      healthy_min_female,
      healthy_max_female
    } = body;

    // Validate input
    if (
      (healthy_min_male !== null && healthy_min_male !== undefined && healthy_max_male !== null && healthy_max_male !== undefined && healthy_min_male >= healthy_max_male) ||
      (healthy_min_female !== null && healthy_min_female !== undefined && healthy_max_female !== null && healthy_max_female !== undefined && healthy_min_female >= healthy_max_female)
    ) {
      return NextResponse.json({ error: 'Min value cannot be greater than or equal to max value' }, { status: 400 });
    }

    // Update the metric
    const { data: updatedMetric, error } = await supabase
      .from('metrics_catalog')
      .update({
        healthy_min_male,
        healthy_max_male,
        healthy_min_female,
        healthy_max_female
      })
      .eq('key', metricKey)
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!updatedMetric) {
      return NextResponse.json({ error: 'Metric not found' }, { status: 404 });
    }

    // Invalidate caches
    await supabase.rpc('invalidate_cache_pattern', { pattern: 'measurements:*' });

    return NextResponse.json({ metric: updatedMetric });

  } catch (error: any) {
    console.error('Error updating metric:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
