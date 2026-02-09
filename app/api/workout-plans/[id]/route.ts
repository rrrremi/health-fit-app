import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// GET: Fetch a single workout plan with its workouts
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

    const { data: plan, error } = await supabase
      .from('workout_plans')
      .select(`
        *,
        workout_plan_workouts(
          id, workout_id, order_index, added_at,
          workouts:workout_id(
            id, name, created_at, total_duration_minutes,
            muscle_focus, workout_focus, workout_data, status, rating
          )
        )
      `)
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    if (error || !plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
    }

    // Sort workouts by order_index
    if (plan.workout_plan_workouts) {
      plan.workout_plan_workouts.sort((a: any, b: any) => a.order_index - b.order_index)
    }

    return NextResponse.json({ plan })
  } catch (error) {
    console.error('Error fetching workout plan:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT: Update a workout plan (name, description)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, description } = body

    // Verify ownership
    const { data: existing } = await supabase
      .from('workout_plans')
      .select('id')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
    }

    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString()
    }

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json({ error: 'Plan name is required' }, { status: 400 })
      }
      if (name.trim().length > 100) {
        return NextResponse.json({ error: 'Plan name cannot exceed 100 characters' }, { status: 400 })
      }
      updateData.name = name.trim()
    }

    if (description !== undefined) {
      if (description && typeof description === 'string' && description.length > 500) {
        return NextResponse.json({ error: 'Description cannot exceed 500 characters' }, { status: 400 })
      }
      updateData.description = description?.trim() || null
    }

    const { data: plan, error } = await supabase
      .from('workout_plans')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating workout plan:', error)
      return NextResponse.json({ error: 'Failed to update plan' }, { status: 500 })
    }

    return NextResponse.json({ plan })
  } catch (error) {
    console.error('Error in workout plan PUT:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE: Delete a workout plan (share link expires automatically)
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

    // Verify ownership
    const { data: existing } = await supabase
      .from('workout_plans')
      .select('id')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
    }

    const { error } = await supabase
      .from('workout_plans')
      .delete()
      .eq('id', params.id)

    if (error) {
      console.error('Error deleting workout plan:', error)
      return NextResponse.json({ error: 'Failed to delete plan' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in workout plan DELETE:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
