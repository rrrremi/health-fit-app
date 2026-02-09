import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// Simple in-memory rate limiting
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(userId)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + 3600000 })
    return true
  }
  if (entry.count >= 30) return false
  entry.count++
  return true
}

// GET: List all workout plans for the authenticated user
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: plans, error } = await supabase
      .from('workout_plans')
      .select(`
        id, name, description, share_token, created_at, updated_at,
        workout_plan_workouts(count)
      `)
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Error fetching workout plans:', error)
      return NextResponse.json({ error: 'Failed to fetch plans' }, { status: 500 })
    }

    const formatted = (plans || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      share_token: p.share_token,
      created_at: p.created_at,
      updated_at: p.updated_at,
      workout_count: p.workout_plan_workouts?.[0]?.count ?? 0
    }))

    return NextResponse.json({ plans: formatted })
  } catch (error) {
    console.error('Error in workout plans GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST: Create a new workout plan
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!checkRateLimit(user.id)) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
    }

    const body = await request.json()
    const { name, description } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Plan name is required' }, { status: 400 })
    }

    if (name.trim().length > 100) {
      return NextResponse.json({ error: 'Plan name cannot exceed 100 characters' }, { status: 400 })
    }

    if (description && typeof description === 'string' && description.length > 500) {
      return NextResponse.json({ error: 'Description cannot exceed 500 characters' }, { status: 400 })
    }

    let plan, error
    try {
      const result = await supabase
        .from('workout_plans')
        .insert({
          user_id: user.id,
          name: name.trim(),
          description: description?.trim() || null
        })
        .select()
        .single()
      plan = result.data
      error = result.error
    } catch (insertError) {
      console.error('Supabase insert threw:', insertError)
      return NextResponse.json({ error: 'Database temporarily unavailable. Please try again.' }, { status: 503 })
    }

    if (error) {
      console.error('Error creating workout plan:', JSON.stringify(error, null, 2))
      return NextResponse.json({ error: `Failed to create plan: ${error.message || error.code}` }, { status: 500 })
    }

    return NextResponse.json({ plan }, { status: 201 })
  } catch (error) {
    console.error('Error in workout plans POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
