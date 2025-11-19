import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { cacheHelper, cacheKeys } from '@/lib/cache';
import { measurementLimiter } from '@/lib/rate-limiter';
import type { ApiError, MeasurementResponse } from '@/types/api';

export const dynamic = 'force-dynamic';

// Validation schema
const updateMeasurementSchema = z.object({
  value: z.number()
    .min(0, 'Value must be positive')
    .max(10000, 'Value too large')
    .finite('Value must be finite'),
  unit: z.string()
    .min(1, 'Unit is required')
    .max(20, 'Unit too long')
    .regex(/^[a-zA-Z0-9%/\s°²³µ·-]+$/, 'Invalid unit format'),
  measured_at: z.string().datetime().optional(),
  notes: z.string().max(500, 'Notes too long').optional().nullable()
});

// UPDATE measurement
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' } satisfies ApiError, { status: 401 });
    }

    // Rate limiting
    const rateLimitResult = await measurementLimiter.checkLimit('update', user.id);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: 'Too many requests. Please try again later.',
          resetAt: rateLimitResult.resetAt,
          remaining: rateLimitResult.remaining
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Remaining': rateLimitResult.remaining?.toString() || '0',
            'X-RateLimit-Reset': rateLimitResult.resetAt?.toString() || '',
            'Retry-After': Math.ceil(((rateLimitResult.resetAt || 0) - Date.now()) / 1000).toString()
          }
        }
      );
    }

    // Validate ID format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(params.id)) {
      return NextResponse.json(
        { error: 'Invalid measurement ID' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Validate input with Zod
    const validation = updateMeasurementSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          details: validation.error.issues.map((issue) => issue.message)
        },
        { status: 400 }
      );
    }

    const { value, unit, measured_at, notes } = validation.data;

    // Verify ownership first
    const { data: existing } = await supabase
      .from('measurements')
      .select('user_id, metric')
      .eq('id', params.id)
      .single();

    if (!existing) {
      return NextResponse.json(
        { error: 'Measurement not found' },
        { status: 404 }
      );
    }

    if (existing.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Update measurement (measured_at only if explicitly provided, updated_at handled by trigger)
    const updateData: any = {
      value,
      unit,
      notes: notes || null,
    };
    
    // Only update measured_at if explicitly provided
    if (measured_at) {
      updateData.measured_at = measured_at;
    }
    
    const { data, error } = await supabase
      .from('measurements')
      .update(updateData)
      .eq('id', params.id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Update error:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Measurement not found or unauthorized' },
        { status: 404 }
      );
    }

    // Invalidate cache for this user
    cacheHelper.invalidate(cacheKeys.userMeasurements(user.id));

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('PATCH /api/measurements/[id] error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE measurement
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting
    const rateLimitResult = await measurementLimiter.checkLimit('delete', user.id);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: 'Too many requests. Please try again later.',
          resetAt: rateLimitResult.resetAt,
          remaining: rateLimitResult.remaining
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Remaining': rateLimitResult.remaining?.toString() || '0',
            'X-RateLimit-Reset': rateLimitResult.resetAt?.toString() || '',
            'Retry-After': Math.ceil(((rateLimitResult.resetAt || 0) - Date.now()) / 1000).toString()
          }
        }
      );
    }

    // Validate ID format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(params.id)) {
      return NextResponse.json(
        { error: 'Invalid measurement ID' },
        { status: 400 }
      );
    }

    // Verify ownership first
    const { data: existing } = await supabase
      .from('measurements')
      .select('user_id')
      .eq('id', params.id)
      .single();

    if (!existing) {
      return NextResponse.json(
        { error: 'Measurement not found' },
        { status: 404 }
      );
    }

    if (existing.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Delete measurement
    const { error } = await supabase
      .from('measurements')
      .delete()
      .eq('id', params.id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Delete error:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Invalidate cache for this user
    cacheHelper.invalidate(cacheKeys.userMeasurements(user.id));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('DELETE /api/measurements/[id] error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
