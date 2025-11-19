import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// Validation schema for creating a measurement
const createMeasurementSchema = z.object({
  metric: z.string().min(1, 'Metric is required'),
  value: z.number().finite('Value must be a valid number'),
  unit: z.string().min(1, 'Unit is required'),
  measured_at: z.string().datetime('Invalid date format'),
  source: z.string().default('manual'),
  confidence: z.number().min(0).max(1).default(0.95),
  notes: z.string().optional(),
  image_url: z.string().url().optional().nullable(),
});

/**
 * POST /api/measurements
 * Create a new measurement
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = createMeasurementSchema.parse(body);

    // Insert measurement
    const { data: measurement, error: insertError } = await supabase
      .from('measurements')
      .insert({
        user_id: user.id,
        metric: validatedData.metric,
        value: validatedData.value,
        unit: validatedData.unit,
        measured_at: validatedData.measured_at,
        source: validatedData.source,
        confidence: validatedData.confidence,
        notes: validatedData.notes || null,
        image_url: validatedData.image_url || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return NextResponse.json(
        { error: 'Failed to create measurement', details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        message: 'Measurement created successfully',
        measurement 
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Create measurement error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
