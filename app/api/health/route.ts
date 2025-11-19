import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Check database connection
    const supabase = await createClient();
    const { error } = await supabase.from('measurements').select('id').limit(1);
    
    if (error) {
      return NextResponse.json(
        { 
          status: 'unhealthy', 
          database: 'error',
          timestamp: new Date().toISOString() 
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'unhealthy', 
        error: 'Internal error',
        timestamp: new Date().toISOString() 
      },
      { status: 503 }
    );
  }
}
