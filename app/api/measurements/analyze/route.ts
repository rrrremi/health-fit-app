import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cacheHelper, cacheKeys, cacheTTL } from '@/lib/cache'
import { AnalysisSchema, AnalysisResponse } from '@/lib/validations/analysis'
import { getOpenAIClient } from '@/lib/openai-client'

const openai = getOpenAIClient()

// Rate limiting constants
const ANALYSIS_RATE_LIMIT = 5 // Max analyses per day
const ANALYSIS_RATE_WINDOW = 24 * 60 * 60 * 1000 // 24 hours
const ANALYSIS_CACHE_WINDOW = 60 * 60 * 1000 // 1 hour - return cached if recent
const OPENAI_TIMEOUT = 60000 // 60 seconds

// ULTRA-OPTIMIZED: Minimal prompt (600 tokens vs 1500 tokens = 60% reduction)
const SYSTEM_PROMPT = `meta-clinician-analyst master.CSV + pre-calculated KPIs in; JSON out only.

do in order: performQC, findKeyTrends, deriveMetrics, giveAllKPIs, findCorrelations, findParadoxes, findAllRisks, findBestNextSteps, findUncertainties, findDataGaps, summarizePreciselyAllFindingsInResults,
Schema:
{
  "sum": "",
  "qc": [{"item":"","type":"unit/range/miss/dup/date","detail":""}],
  "norm": [""],
  "drv": [{"name":"","val":null,"unit":"","meth":"","inputs":[],"ok":true,"note":""}],
  "state": [{"metric":"","val":null,"unit":"","date":"","interp":""}],
  "tr": [{"metric":"","dir":"up/down/stable","d_abs":null,"d_pct":null,"start":"","end":"","cmt":""}],
  "rel": [{"between":[],"strength":"weak/mod/strong","pattern":"pos/neg/nonlin","phys":""}],
  "px": [{"finding":"","why":"","expl":[]}],
  "hyp": [{"claim":"","ev":[],"alt":[]}],
  "risk": [{"area":"","lvl":"low/mod/high","why":""}],
  "next": {
    "labs": [{"test":"","why":"","when":""}],
    "life": [],
    "clinic": []
  },
  "unc": [],
  "gaps": []
}

Rules: be precise but explanatory; respect units; if derived invalid set ok=false with note.`

// Map abbreviated response to full schema
function mapAbbreviatedResponse(abbreviated: AnalysisResponse): any {
  return {
    summary: abbreviated.sum || '',
    qc_issues: (abbreviated.qc || []).map((item) => ({
      item: item.item || '',
      type: item.type || '',
      detail: item.detail || ''
    })),
    normalization_notes: abbreviated.norm || [],
    derived_metrics: (abbreviated.drv || []).map((item) => ({
      name: item.name || '',
      value: item.val,
      unit: item.unit || '',
      method: item.meth || '',
      input_used: item.inputs || [],
      valid: item.ok !== false,
      note: item.note || ''
    })),
    current_state: (abbreviated.state || []).map((item) => ({
      metric: item.metric || '',
      latest_value: item.val,
      unit: item.unit || '',
      date: item.date || '',
      interpretation: item.interp || ''
    })),
    trends: (abbreviated.tr || []).map((item) => ({
      metric: item.metric || '',
      direction: item.dir || '',
      delta_abs: item.d_abs,
      delta_pct: item.d_pct,
      start_date: item.start || '',
      end_date: item.end || '',
      comment: item.cmt || ''
    })),
    correlations: (abbreviated.rel || []).map((item) => ({
      between: item.between || [],
      strength: item.strength || '',
      pattern: item.pattern || '',
      physiology: item.phys || ''
    })),
    paradoxes: (abbreviated.px || []).map((item) => ({
      finding: item.finding || '',
      why_paradoxical: item.why || '',
      possible_explanations: item.expl || []
    })),
    hypotheses: (abbreviated.hyp || []).map((item) => ({
      claim: item.claim || '',
      evidence: item.ev || [],
      alt_explanations: item.alt || []
    })),
    risk_assessment: (abbreviated.risk || []).map((item) => ({
      area: item.area || '',
      level: item.lvl || '',
      rationale: item.why || ''
    })),
    recommendations_next_steps: {
      labs_to_repeat_or_add: (abbreviated.next?.labs || []).map((item) => ({
        test: item.test || '',
        why: item.why || '',
        timing: item.when || ''
      })),
      lifestyle_focus: abbreviated.next?.life || [],
      clinical_followup: abbreviated.next?.clinic || []
    },
    uncertainties: abbreviated.unc || [],
    data_gaps: abbreviated.gaps || []
  }
}

interface Measurement {
  metric: string
  value: number
  unit: string
  measured_at: string
  source: string
}

function formatMeasurementsAsCSV(
  profile: { age: number | null; sex: string | null },
  measurements: Measurement[],
  catalogData: Record<string, { display_name: string; category: string }>
): string {
  // Group by metric
  const byMetric = measurements.reduce((acc, m) => {
    if (!acc[m.metric]) acc[m.metric] = []
    acc[m.metric].push(m)
    return acc
  }, {} as Record<string, Measurement[]>)

  // Get last 15 per metric
  const limitedData: Measurement[] = []

  for (const [metric, values] of Object.entries(byMetric)) {
    const sorted = values
      .sort((a, b) => new Date(b.measured_at).getTime() - new Date(a.measured_at).getTime())
      .slice(0, 15) // Take last 15 per metric
    limitedData.push(...sorted)
  }

  // OPTIMIZED: Simplified CSV format (remove display_name, category, source)
  const csvHeader = 'metric,value,unit,date'
  const csvRows = limitedData.map(m => {
    const date = new Date(m.measured_at).toISOString().split('T')[0]
    const value = m.value.toFixed(1) // Reduce precision

    return `${m.metric},${value},${m.unit},${date}`
  })

  // Combine
  const csv = [csvHeader, ...csvRows].join('\n')

  // Build final prompt
  return `User Profile:
Age: ${profile.age || 'not provided'}
Sex: ${profile.sex || 'not provided'}

Measurements (CSV format, last 15 values per metric, newest first):
${csv}`
}

export async function POST(request: Request) {
  const startTime = Date.now()
  
  try {
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin (admins bypass rate limits)
    let isAdmin = false
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single()
      isAdmin = profile?.is_admin || false
    } catch {
      // Continue with rate limiting if admin check fails
    }

    // Check for recent cached analysis (within 1 hour)
    const { data: recentAnalysis } = await supabase
      .from('health_analyses')
      .select('id, created_at, full_response')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (recentAnalysis) {
      const analysisAge = Date.now() - new Date(recentAnalysis.created_at).getTime()
      if (analysisAge < ANALYSIS_CACHE_WINDOW) {
        // Return cached analysis
        if (process.env.NODE_ENV === 'development') {
          console.log(`Returning cached analysis (${Math.round(analysisAge / 60000)} min old)`)
        }
        return NextResponse.json({
          analysis_id: recentAnalysis.id,
          status: 'cached',
          data: recentAnalysis.full_response,
          cached: true,
          cache_age_minutes: Math.round(analysisAge / 60000)
        })
      }
    }

    // Rate limiting for non-admin users
    if (!isAdmin) {
      const yesterday = new Date(Date.now() - ANALYSIS_RATE_WINDOW)
      const { count } = await supabase
        .from('health_analyses')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', yesterday.toISOString())

      if (count && count >= ANALYSIS_RATE_LIMIT) {
        return NextResponse.json(
          { error: `Rate limit exceeded. You can generate up to ${ANALYSIS_RATE_LIMIT} analyses per day.` },
          { status: 429 }
        )
      }
    }

    // OPTIMIZATION 1: Parallel queries instead of sequential
    const [profileResult, measurementsResult, catalogData] = await Promise.all([
      // Get user profile
      supabase
        .from('profiles')
        .select('age, sex')
        .eq('id', user.id)
        .single(),
      
      // OPTIMIZATION 2: Limit data at DB level - get recent measurements
      supabase
        .from('measurements')
        .select('metric, value, unit, measured_at, source')
        .eq('user_id', user.id)
        .order('measured_at', { ascending: false })
        .limit(1000), // Get enough data to have 15 per metric (e.g., ~60 metrics × 15 = 900)
      
      // OPTIMIZATION 3: Cache catalog (rarely changes)
      cacheHelper.getOrSet(
        cacheKeys.metricsCatalog(),
        async () => {
          const { data } = await supabase
            .from('metrics_catalog')
            .select('key, display_name, category')
          
          return (data || []).reduce((acc, item) => {
            acc[item.key] = { display_name: item.display_name, category: item.category }
            return acc
          }, {} as Record<string, { display_name: string; category: string }>)
        },
        cacheTTL.LONG // 15 minutes - catalog rarely changes
      )
    ])

    const { data: profile, error: profileError } = profileResult
    const { data: measurements, error: measurementsError } = measurementsResult

    if (profileError) {
      console.error('Profile error:', profileError)
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
    }

    if (measurementsError) {
      console.error('Measurements error:', measurementsError)
      return NextResponse.json({ error: 'Failed to fetch measurements' }, { status: 500 })
    }

    // Validate minimum data
    if (!measurements || measurements.length < 5) {
      return NextResponse.json(
        { error: 'Need at least 5 measurements to generate analysis' },
        { status: 400 }
      )
    }

    const dbTime = Date.now() - startTime
    if (process.env.NODE_ENV === 'development') {
      console.log(`DB queries completed in ${dbTime}ms`)
    }

    // Format data as CSV
    const csvData = formatMeasurementsAsCSV(profile, measurements, catalogData)

    // Get date range
    const dates = measurements.map(m => new Date(m.measured_at).getTime())
    const dateRangeStart = new Date(Math.min(...dates)).toISOString()
    const dateRangeEnd = new Date(Math.max(...dates)).toISOString()

    // Call OpenAI with timeout and retry
    const aiStartTime = Date.now()
    const uniqueMetrics = new Set(measurements.map(m => m.metric))
    const metricsCount = uniqueMetrics.size
    if (process.env.NODE_ENV === 'development') {
      console.log(`Calling OpenAI for health analysis (${metricsCount} metrics, ${measurements.length} data points)...`)
    }
    
    // Helper function to call OpenAI with timeout
    const callOpenAIWithTimeout = async (retryAttempt = false) => {
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('OpenAI API timeout - please try again')), OPENAI_TIMEOUT)
      )
      
      const apiPromise = openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { 
            role: 'system', 
            content: retryAttempt 
              ? SYSTEM_PROMPT + '\n\nIMPORTANT: Return ONLY valid JSON matching the exact schema above. No extra text.'
              : SYSTEM_PROMPT 
          },
          { role: 'user', content: csvData }
        ],
        temperature: 0,
        response_format: { type: 'json_object' }
      })
      
      return Promise.race([apiPromise, timeoutPromise])
    }
    
    let completion
    let responseText: string | null = null
    let jsonResponse
    let validationResult
    let parseAttempts = 0
    const maxAttempts = 2
    
    while (parseAttempts < maxAttempts) {
      parseAttempts++
      try {
        completion = await callOpenAIWithTimeout(parseAttempts > 1)
        responseText = completion.choices[0].message.content
        
        if (!responseText) {
          throw new Error('Empty response from OpenAI')
        }
        
        // Parse JSON response
        jsonResponse = JSON.parse(responseText)
        
        // Validate with Zod
        validationResult = AnalysisSchema.safeParse(jsonResponse)
        
        if (validationResult.success) {
          break // Success, exit retry loop
        }
        
        if (parseAttempts < maxAttempts) {
          if (process.env.NODE_ENV === 'development') {
            console.log('Schema validation failed, retrying with stricter prompt...')
          }
        }
      } catch (parseError) {
        if (parseAttempts >= maxAttempts) {
          throw parseError
        }
        if (process.env.NODE_ENV === 'development') {
          console.log('Parse error, retrying...', parseError)
        }
      }
    }
    
    if (!validationResult?.success || !completion) {
      console.error('Schema validation failed after retries:', validationResult?.error)
      throw new Error('AI response did not match expected schema after retries')
    }
    
    const aiTime = Date.now() - aiStartTime
    if (process.env.NODE_ENV === 'development') {
      console.log(`OpenAI completed in ${aiTime}ms (attempts: ${parseAttempts})`)
    }
    
    // Map abbreviated response to full schema using the validated data
    const analysisData = mapAbbreviatedResponse(validationResult.data);
    
    // Extract token usage safely
    const promptTokens = completion.usage?.prompt_tokens ?? 0
    const completionTokens = completion.usage?.completion_tokens ?? 0

    // Store in database
    const { data: analysis, error: insertError } = await supabase
      .from('health_analyses')
      .insert({
        user_id: user.id,
        user_age: profile.age,
        user_sex: profile.sex,
        measurements_snapshot: csvData,
        metrics_count: metricsCount,
        date_range_start: dateRangeStart,
        date_range_end: dateRangeEnd,
        ai_provider: 'openai',
        model_version: completion.model,
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_cost: (promptTokens * 0.0025 + completionTokens * 0.01) / 1000,
        summary: analysisData.summary,
        qc_issues: analysisData.qc_issues,
        normalization_notes: analysisData.normalization_notes,
        derived_metrics: analysisData.derived_metrics,
        current_state: analysisData.current_state,
        trends: analysisData.trends,
        correlations: analysisData.correlations,
        paradoxes: analysisData.paradoxes,
        hypotheses: analysisData.hypotheses,
        risk_assessment: analysisData.risk_assessment,
        recommendations_next_steps: analysisData.recommendations_next_steps,
        uncertainties: analysisData.uncertainties,
        data_gaps: analysisData.data_gaps,
        full_response: analysisData,
        status: 'completed'
      })
      .select()
      .single()

    if (insertError) {
      console.error('Insert error:', insertError)
      return NextResponse.json({ error: 'Failed to save analysis' }, { status: 500 })
    }

    const totalTime = Date.now() - startTime
    if (process.env.NODE_ENV === 'development') {
      console.log(`Health analysis completed: ${analysis.id} (total: ${totalTime}ms, db: ${dbTime}ms, ai: ${aiTime}ms)`)
    }

    return NextResponse.json({
      analysis_id: analysis.id,
      status: 'completed',
      data: analysisData,
      ...(process.env.NODE_ENV === 'development' && {
        performance: {
          total_ms: totalTime,
          db_ms: dbTime,
          ai_ms: aiTime,
          tokens: { prompt: promptTokens, completion: completionTokens }
        }
      })
    })

  } catch (error: any) {
    console.error('Error generating health analysis:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
