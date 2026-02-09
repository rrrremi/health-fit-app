import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// POST: Add a workout to a plan
export async function POST(
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

    const { workoutId } = await request.json()

    if (!workoutId) {
      return NextResponse.json({ error: 'workoutId is required' }, { status: 400 })
    }

    // Verify user owns the workout
    const { data: workout } = await supabase
      .from('workouts')
      .select('id')
      .eq('id', workoutId)
      .eq('user_id', user.id)
      .single()

    if (!workout) {
      return NextResponse.json({ error: 'Workout not found' }, { status: 404 })
    }

    // Get next order_index
    const { data: maxOrder } = await supabase
      .from('workout_plan_workouts')
      .select('order_index')
      .eq('plan_id', params.id)
      .order('order_index', { ascending: false })
      .limit(1)
      .maybeSingle()

    const nextIndex = (maxOrder?.order_index ?? -1) + 1

    const { error } = await supabase
      .from('workout_plan_workouts')
      .insert({
        plan_id: params.id,
        workout_id: workoutId,
        order_index: nextIndex
      })

    if (error) {
      console.error('Error adding workout to plan:', error)
      return NextResponse.json({ error: 'Failed to add workout' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in plan workouts POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE: Remove a workout from a plan
export async function DELETE(
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

    const { workoutId, planWorkoutId } = await request.json()

    if (!workoutId && !planWorkoutId) {
      return NextResponse.json({ error: 'workoutId or planWorkoutId is required' }, { status: 400 })
    }

    let query = supabase
      .from('workout_plan_workouts')
      .delete()
      .eq('plan_id', params.id)

    if (planWorkoutId) {
      query = query.eq('id', planWorkoutId)
    } else {
      query = query.eq('workout_id', workoutId)
    }

    const { error } = await query

    if (error) {
      console.error('Error removing workout from plan:', error)
      return NextResponse.json({ error: 'Failed to remove workout' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in plan workouts DELETE:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
