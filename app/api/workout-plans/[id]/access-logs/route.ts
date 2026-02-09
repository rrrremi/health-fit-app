import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// GET: Fetch access logs for a plan (owner only)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify plan ownership
    const { data: plan } = await supabase
      .from('workout_plans')
      .select('id')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
    }

    const { data: logs, error } = await supabase
      .from('workout_plan_access_logs')
      .select('id, accessed_at, ip_address, user_agent')
      .eq('plan_id', params.id)
      .order('accessed_at', { ascending: false })
      .limit(100)

    if (error) {
      console.error('Error fetching access logs:', error)
      return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 })
    }

    return NextResponse.json({ logs: logs || [] })
  } catch (error) {
    console.error('Error in access logs GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
