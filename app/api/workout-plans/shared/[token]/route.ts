import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// Anon client for public-facing reads (plans, plan_workouts, access_logs)
function createAnonClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Service role client to bypass RLS on workouts table for shared view
function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET: Public endpoint - fetch shared plan by token + log access
export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const supabase = createServiceClient()

    // Validate token format (32 hex chars)
    if (!params.token || !/^[a-f0-9]{32}$/.test(params.token)) {
      return NextResponse.json({ error: 'Invalid link' }, { status: 400 })
    }

    // Step 1: Fetch the plan by share token
    const { data: plan, error: planError } = await supabase
      .from('workout_plans')
      .select('id, name, description, share_token, created_at, updated_at')
      .eq('share_token', params.token)
      .single()

    if (planError || !plan) {
      return NextResponse.json({ error: 'Plan not found or link expired' }, { status: 404 })
    }

    // Step 2: Fetch plan-workout links
    const { data: planWorkouts } = await supabase
      .from('workout_plan_workouts')
      .select('id, workout_id, order_index, added_at')
      .eq('plan_id', plan.id)
      .order('order_index', { ascending: true })

    // Step 3: Fetch actual workout data
    const workoutIds = Array.from(new Set((planWorkouts || []).map((pw: any) => pw.workout_id)))
    let workoutsMap: Record<string, any> = {}

    if (workoutIds.length > 0) {
      const { data: workouts } = await supabase
        .from('workouts')
        .select('id, name, created_at, total_duration_minutes, muscle_focus, workout_focus, workout_data, status, rating')
        .in('id', workoutIds)

      if (workouts) {
        workoutsMap = Object.fromEntries(workouts.map((w: any) => [w.id, w]))
      }
    }

    // Step 4: Assemble the response
    const assembledPlanWorkouts = (planWorkouts || []).map((pw: any) => ({
      ...pw,
      workouts: workoutsMap[pw.workout_id] || null
    }))

    // Log access (fire-and-forget, don't block response)
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    supabase
      .from('workout_plan_access_logs')
      .insert({
        plan_id: plan.id,
        ip_address: ip.substring(0, 45),
        user_agent: userAgent.substring(0, 500)
      })
      .then(({ error: logError }: { error: any }) => {
        if (logError) console.error('Error logging plan access:', logError)
      })

    return NextResponse.json(
      {
        plan: {
          ...plan,
          workout_plan_workouts: assembledPlanWorkouts
        }
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache'
        }
      }
    )
  } catch (error) {
    console.error('Error fetching shared plan:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
