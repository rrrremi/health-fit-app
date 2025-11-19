'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft, Activity, AlertCircle, TrendingUp, TrendingDown, Minus, Calendar, BarChart3 } from 'lucide-react'
import type { HealthAnalysis } from '@/types/health-analysis'

export default function AnalysisDetailPage() {
  const router = useRouter()
  const params = useParams()
  const [analysis, setAnalysis] = useState<HealthAnalysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          router.push('/auth/login')
          return
        }

        const { data, error: fetchError } = await supabase
          .from('health_analyses')
          .select('*')
          .eq('id', params.id)
          .eq('user_id', user.id)
          .single()

        if (fetchError) {
          throw fetchError
        }

        setAnalysis(data as HealthAnalysis)
      } catch (err: any) {
        console.error('Error fetching analysis:', err)
        setError(err.message || 'Failed to load analysis')
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      fetchAnalysis()
    }
  }, [params.id, router, supabase])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-white border-t-transparent rounded-full mx-auto mb-2"></div>
          <p className="text-xs text-white/70">Loading analysis...</p>
        </div>
      </div>
    )
  }

  if (error || !analysis) {
    return (
      <section className="mx-auto w-full max-w-3xl px-2 pb-10">
        <div className="mb-2">
          <Link href="/protected/profile">
            <button className="flex items-center gap-1.5 rounded-lg border border-transparent bg-white/5 px-3 py-1.5 text-xs text-white/80 backdrop-blur-xl hover:bg-white/10 transition-colors">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </button>
          </Link>
        </div>
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          {error || 'Analysis not found'}
        </div>
      </section>
    )
  }

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
      case 'moderate': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'
      case 'high': return 'text-destructive bg-destructive/10 border-destructive/20'
      default: return 'text-white/70 bg-white/5 border-white/10'
    }
  }

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'up': return <TrendingUp className="h-3 w-3" />
      case 'down': return <TrendingDown className="h-3 w-3" />
      default: return <Minus className="h-3 w-3" />
    }
  }

  return (
    <section className="mx-auto w-full max-w-3xl px-2 pb-10">
      {/* Back button */}
      <div className="mb-2">
        <Link href="/protected/profile">
          <button className="flex items-center gap-1.5 rounded-lg border border-transparent bg-white/5 px-3 py-1.5 text-xs text-white/80 backdrop-blur-xl hover:bg-white/10 transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Profile
          </button>
        </Link>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-3"
      >
        {/* Header */}
        <div className="rounded-lg border border-transparent bg-white/5 p-3 backdrop-blur-xl">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl tracking-tight flex items-center gap-2">
                <Activity className="h-5 w-5 text-emerald-400" />
                Health Analysis
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-white/50 flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(analysis.created_at).toLocaleDateString()}
                </span>
                <span className="text-xs text-white/50 flex items-center gap-1">
                  <BarChart3 className="h-3 w-3" />
                  {analysis.metrics_count} metrics analyzed
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="rounded-lg border border-transparent bg-white/5 p-3 backdrop-blur-xl">
          <h2 className="text-sm font-medium text-white/90 mb-2">Summary</h2>
          <p className="text-xs text-white/70 leading-relaxed">{analysis.summary}</p>
        </div>

        {/* Risk Assessment */}
        {analysis.risk_assessment && analysis.risk_assessment.length > 0 && (
          <div className="rounded-lg border border-transparent bg-white/5 p-3 backdrop-blur-xl">
            <h2 className="text-sm font-medium text-white/90 mb-2 flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4" />
              Risk Assessment
            </h2>
            <div className="space-y-2">
              {analysis.risk_assessment.map((risk, idx) => (
                <div key={idx} className={`rounded-lg border p-2 ${getRiskColor(risk.level)}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium capitalize">{risk.level} Risk</span>
                        <span className="text-xs opacity-70">•</span>
                        <span className="text-xs">{risk.area}</span>
                      </div>
                      <p className="text-xs opacity-90">{risk.rationale}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Trends */}
        {analysis.trends && analysis.trends.length > 0 && (
          <div className="rounded-lg border border-transparent bg-white/5 p-3 backdrop-blur-xl">
            <h2 className="text-sm font-medium text-white/90 mb-2">Trends</h2>
            <div className="space-y-2">
              {analysis.trends.slice(0, 10).map((trend, idx) => (
                <div key={idx} className="rounded-lg border border-white/10 bg-white/5 p-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1">
                      {getTrendIcon(trend.direction)}
                      <span className="text-xs text-white/90">{trend.metric}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-white/60">
                      {trend.delta_abs !== null && (
                        <span>{trend.delta_abs > 0 ? '+' : ''}{trend.delta_abs}</span>
                      )}
                      {trend.delta_pct !== null && (
                        <span className="text-[10px]">({trend.delta_pct > 0 ? '+' : ''}{trend.delta_pct}%)</span>
                      )}
                    </div>
                  </div>
                  {trend.comment && (
                    <p className="text-[10px] text-white/50 mt-1">{trend.comment}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Derived Metrics */}
        {analysis.derived_metrics && analysis.derived_metrics.length > 0 && (
          <div className="rounded-lg border border-transparent bg-white/5 p-3 backdrop-blur-xl">
            <h2 className="text-sm font-medium text-white/90 mb-2">Derived Metrics</h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {analysis.derived_metrics.map((metric, idx) => (
                <div key={idx} className="rounded-lg border border-white/10 bg-white/5 p-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-white/90">{metric.name}</span>
                    {metric.valid ? (
                      <span className="text-xs text-emerald-400">✓</span>
                    ) : (
                      <span className="text-xs text-destructive">✗</span>
                    )}
                  </div>
                  <div className="text-xs text-white/70">
                    {metric.value !== null ? `${metric.value} ${metric.unit}` : 'N/A'}
                  </div>
                  {metric.note && (
                    <p className="text-[10px] text-white/50 mt-1">{metric.note}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {analysis.recommendations_next_steps && (
          <div className="rounded-lg border border-transparent bg-white/5 p-3 backdrop-blur-xl">
            <h2 className="text-sm font-medium text-white/90 mb-2">Recommendations</h2>
            
            {analysis.recommendations_next_steps.labs_to_repeat_or_add && analysis.recommendations_next_steps.labs_to_repeat_or_add.length > 0 && (
              <div className="mb-3">
                <h3 className="text-xs font-medium text-white/80 mb-1.5">Labs to Repeat/Add</h3>
                <div className="space-y-1.5">
                  {analysis.recommendations_next_steps.labs_to_repeat_or_add.map((lab, idx) => (
                    <div key={idx} className="rounded-lg border border-white/10 bg-white/5 p-2">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs text-white/90">{lab.test}</span>
                        <span className="text-[10px] text-white/50">{lab.timing}</span>
                      </div>
                      <p className="text-[10px] text-white/60 mt-1">{lab.why}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {analysis.recommendations_next_steps.lifestyle_focus && analysis.recommendations_next_steps.lifestyle_focus.length > 0 && (
              <div className="mb-3">
                <h3 className="text-xs font-medium text-white/80 mb-1.5">Lifestyle Focus</h3>
                <ul className="space-y-1">
                  {analysis.recommendations_next_steps.lifestyle_focus.map((item, idx) => (
                    <li key={idx} className="text-xs text-white/70 flex items-start gap-2">
                      <span className="text-emerald-400 mt-0.5">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {analysis.recommendations_next_steps.clinical_followup && analysis.recommendations_next_steps.clinical_followup.length > 0 && (
              <div>
                <h3 className="text-xs font-medium text-white/80 mb-1.5">Clinical Follow-up</h3>
                <ul className="space-y-1">
                  {analysis.recommendations_next_steps.clinical_followup.map((item, idx) => (
                    <li key={idx} className="text-xs text-white/70 flex items-start gap-2">
                      <span className="text-cyan-400 mt-0.5">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Disclaimer */}
        <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-3 backdrop-blur-xl">
          <p className="text-[10px] text-yellow-300/90 leading-relaxed">
            <strong>⚠️ Important:</strong> This analysis is generated by AI for informational purposes only. 
            It is not medical advice, diagnosis, or treatment. Always consult with a qualified healthcare 
            provider before making any health decisions.
          </p>
        </div>
      </motion.div>
    </section>
  )
}
