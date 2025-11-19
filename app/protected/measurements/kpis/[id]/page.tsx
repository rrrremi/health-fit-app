'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, TrendingUp, Search, Filter, CheckCircle2, AlertTriangle, AlertCircle, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react'

interface KPI {
  id: string
  name: string
  cat: string
  f: string
  m: string[]
  v?: number
  u?: string
  r?: string
  d: string
}

interface KPIRecord {
  id: string
  created_at: string
  kpis: KPI[]
  metrics_count: number
}

type KPIStatus = 'optimal' | 'borderline' | 'attention' | 'unknown'

// Helper: Parse optimal range and determine status
function getKPIStatus(kpi: KPI): KPIStatus {
  if (!kpi.r || kpi.v === undefined) return 'unknown'
  
  const value = kpi.v
  const range = kpi.r.trim()
  
  try {
    // Handle ranges like "<4", ">60", "18.5-24.9", "0.5-2.0"
    if (range.startsWith('<')) {
      const max = parseFloat(range.substring(1))
      if (value < max) return 'optimal'
      if (value < max * 1.1) return 'borderline'
      return 'attention'
    }
    
    if (range.startsWith('>')) {
      const min = parseFloat(range.substring(1))
      if (value > min) return 'optimal'
      if (value > min * 0.9) return 'borderline'
      return 'attention'
    }
    
    if (range.includes('-')) {
      const [minStr, maxStr] = range.split('-')
      const min = parseFloat(minStr)
      const max = parseFloat(maxStr)
      const rangeSize = max - min
      
      if (value >= min && value <= max) return 'optimal'
      if (value >= min - rangeSize * 0.1 && value <= max + rangeSize * 0.1) return 'borderline'
      return 'attention'
    }
  } catch (e) {
    return 'unknown'
  }
  
  return 'unknown'
}

// Helper: Get status display info
function getStatusInfo(status: KPIStatus) {
  switch (status) {
    case 'optimal':
      return {
        icon: CheckCircle2,
        label: 'Optimal',
        textColor: 'text-emerald-400',
        bgColor: 'bg-emerald-500/10',
        borderColor: 'border-emerald-500/30',
        badgeBg: 'bg-emerald-500/20',
        badgeText: 'text-emerald-300'
      }
    case 'borderline':
      return {
        icon: AlertTriangle,
        label: 'Borderline',
        textColor: 'text-amber-400',
        bgColor: 'bg-amber-500/10',
        borderColor: 'border-amber-500/30',
        badgeBg: 'bg-amber-500/20',
        badgeText: 'text-amber-300'
      }
    case 'attention':
      return {
        icon: AlertCircle,
        label: 'Attention',
        textColor: 'text-destructive',
        bgColor: 'bg-destructive/10',
        borderColor: 'border-destructive/30',
        badgeBg: 'bg-destructive/20',
        badgeText: 'text-destructive'
      }
    default:
      return {
        icon: HelpCircle,
        label: 'Unknown',
        textColor: 'text-gray-400',
        bgColor: 'bg-gray-500/10',
        borderColor: 'border-gray-500/30',
        badgeBg: 'bg-gray-500/20',
        badgeText: 'text-gray-300'
      }
  }
}

export default function KPIsDetailPage() {
  const router = useRouter()
  const params = useParams()
  const [kpiRecord, setKpiRecord] = useState<KPIRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())
  const supabase = createClient()

  const toggleCard = (kpiId: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev)
      if (next.has(kpiId)) {
        next.delete(kpiId)
      } else {
        next.add(kpiId)
      }
      return next
    })
  }

  useEffect(() => {
    const fetchKPIs = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/auth/login')
          return
        }

        const { data, error: fetchError } = await supabase
          .from('health_kpis')
          .select('*')
          .eq('id', params.id)
          .eq('user_id', user.id)
          .single()

        if (fetchError) {
          throw fetchError
        }

        console.log('Fetched KPI record:', data)
        console.log('KPIs array:', data?.kpis)
        console.log('KPIs length:', data?.kpis?.length)
        
        setKpiRecord(data as KPIRecord)
      } catch (err: any) {
        console.error('Error fetching KPIs:', err)
        setError(err.message || 'Failed to load KPIs')
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      fetchKPIs()
    }
  }, [params.id, router, supabase])

  // IMPORTANT: All hooks must be called before any early returns
  // Ensure kpis is an array (safe even when kpiRecord is null)
  const kpisArray = useMemo(() => {
    return Array.isArray(kpiRecord?.kpis) ? kpiRecord.kpis : []
  }, [kpiRecord])

  // Calculate status for all KPIs
  const kpisWithStatus = useMemo(() => {
    return kpisArray.map(kpi => ({
      ...kpi,
      status: getKPIStatus(kpi)
    }))
  }, [kpisArray])

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    const stats = {
      optimal: 0,
      borderline: 0,
      attention: 0,
      unknown: 0
    }
    kpisWithStatus.forEach(kpi => {
      stats[kpi.status]++
    })
    return stats
  }, [kpisWithStatus])

  // Get unique categories
  const categories = useMemo(() => {
    return Array.from(new Set(kpisArray.map(k => k.cat))).sort()
  }, [kpisArray])

  // Filter KPIs
  const filteredKPIs = useMemo(() => {
    return kpisWithStatus.filter(kpi => {
      const matchesSearch = searchTerm === '' || 
        kpi.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        kpi.d.toLowerCase().includes(searchTerm.toLowerCase()) ||
        kpi.cat.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesCategory = selectedCategory === 'all' || kpi.cat === selectedCategory

      return matchesSearch && matchesCategory
    })
  }, [kpisWithStatus, searchTerm, selectedCategory])

  // Group by category
  const groupedKPIs = useMemo(() => {
    return filteredKPIs.reduce((acc, kpi) => {
      if (!acc[kpi.cat]) acc[kpi.cat] = []
      acc[kpi.cat].push(kpi)
      return acc
    }, {} as Record<string, KPI[]>)
  }, [filteredKPIs])

  // NOW we can do early returns - all hooks have been called
  if (loading) {
    return (
      <section className="mx-auto w-full max-w-3xl px-2 pb-10">
        <div className="mb-2 h-8 w-24 animate-pulse rounded-lg bg-white/5" />
        <div className="space-y-3">
          {/* Header skeleton */}
          <div className="rounded-lg border border-transparent bg-white/5 p-3 backdrop-blur-xl">
            <div className="h-5 w-40 animate-pulse rounded bg-white/10 mb-1" />
            <div className="h-3 w-48 animate-pulse rounded bg-white/5" />
          </div>
          {/* Search skeleton */}
          <div className="rounded-lg border border-transparent bg-white/5 p-2 backdrop-blur-xl">
            <div className="h-7 w-full animate-pulse rounded bg-white/10" />
          </div>
          {/* Cards skeleton */}
          <div className="space-y-1.5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="rounded-lg border border-white/10 bg-white/5 p-2 backdrop-blur-xl">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 animate-pulse rounded-full bg-white/10 shrink-0" />
                  <div className="h-3 flex-1 animate-pulse rounded bg-white/10" />
                  <div className="h-4 w-16 animate-pulse rounded bg-white/10 shrink-0" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (error || !kpiRecord) {
    return (
      <section className="mx-auto w-full max-w-4xl px-2 pb-10">
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{error || 'KPIs not found'}</p>
        </div>
      </section>
    )
  }

  return (
    <section className="mx-auto w-full max-w-3xl px-2 pb-10">
      {/* Back Button */}
      <div className="mb-2">
        <Link href="/protected/profile">
          <button className="flex items-center gap-1.5 rounded-lg border border-transparent bg-white/5 px-3 py-1.5 text-xs text-white/80 backdrop-blur-xl hover:bg-white/10 transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
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
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 text-emerald-400" />
            <h1 className="text-base font-medium tracking-tight text-white/90">Health KPIs</h1>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-white/50">
            <span>{new Date(kpiRecord.created_at).toLocaleDateString()}</span>
            <span>•</span>
            <span>{kpisArray.length} KPIs</span>
            <span>•</span>
            <span>{kpiRecord.metrics_count} metrics</span>
          </div>
        </div>

        {/* Summary Dashboard */}
        <div className="rounded-lg border border-transparent bg-white/5 p-2 backdrop-blur-xl">
          <div className="grid grid-cols-4 gap-2">
            {/* Optimal */}
            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2 text-center">
              <div className="flex items-center justify-center gap-1 mb-0.5">
                <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                <span className="text-[10px] font-normal text-emerald-300">Optimal</span>
              </div>
              <div className="text-lg font-semibold text-emerald-400">{summaryStats.optimal}</div>
            </div>
            
            {/* Borderline */}
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-2 text-center">
              <div className="flex items-center justify-center gap-1 mb-0.5">
                <AlertTriangle className="h-3 w-3 text-amber-400" />
                <span className="text-[10px] font-normal text-amber-300">Borderline</span>
              </div>
              <div className="text-lg font-semibold text-amber-400">{summaryStats.borderline}</div>
            </div>
            
            {/* Attention */}
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-2 text-center">
              <div className="flex items-center justify-center gap-1 mb-0.5">
                <AlertCircle className="h-3 w-3 text-destructive" />
                <span className="text-[10px] font-normal text-destructive">Attention</span>
              </div>
              <div className="text-lg font-semibold text-destructive">{summaryStats.attention}</div>
            </div>
            
            {/* Unknown */}
            <div className="rounded-lg bg-gray-500/10 border border-gray-500/20 p-2 text-center">
              <div className="flex items-center justify-center gap-1 mb-0.5">
                <HelpCircle className="h-3 w-3 text-gray-400" />
                <span className="text-[10px] font-normal text-gray-300">Unknown</span>
              </div>
              <div className="text-lg font-semibold text-gray-400">{summaryStats.unknown}</div>
            </div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="rounded-lg border border-transparent bg-white/5 p-2 backdrop-blur-xl">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/40" />
              <input
                type="text"
                placeholder="Search KPIs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 pl-8 pr-3 py-1.5 text-xs text-white/90 placeholder-white/40 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/40 pointer-events-none" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full sm:w-auto rounded-lg border border-white/10 bg-white/5 pl-8 pr-8 py-1.5 text-xs text-white/90 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 appearance-none cursor-pointer"
              >
                <option value="all">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-2 text-[10px] text-white/50">
            Showing {filteredKPIs.length} of {kpisArray.length} KPIs
          </div>
        </div>

        {/* KPIs Grid */}
        {Object.keys(groupedKPIs).length === 0 ? (
          <div className="rounded-lg border border-white/10 bg-white/5 p-8 text-center backdrop-blur-xl">
            <div className="mx-auto w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
              <Search className="h-6 w-6 text-white/40" />
            </div>
            <h3 className="text-sm font-medium text-white/80 mb-1">No KPIs Found</h3>
            <p className="text-xs text-white/50">
              Try adjusting your search or filter criteria.
            </p>
          </div>
        ) : (
          Object.entries(groupedKPIs).map(([category, kpis], catIndex) => (
            <div
              key={category}
              className="rounded-lg border border-transparent bg-white/5 p-2 backdrop-blur-xl"
            >
              <h2 className="text-xs font-medium text-white/90 mb-2">{category}</h2>
              <div className="space-y-1.5">
                {kpis.map((kpi: any, index) => {
                  const statusInfo = getStatusInfo(kpi.status)
                  const StatusIcon = statusInfo.icon
                  const isExpanded = expandedCards.has(kpi.id)
                  
                  return (
                    <div
                      key={kpi.id}
                      className={`rounded-lg border ${statusInfo.borderColor} ${statusInfo.bgColor} p-2 transition-all duration-200 hover:bg-white/10`}
                    >
                      {/* Main Row - Compact */}
                      <div className="flex items-center gap-2">
                        {/* Status Icon */}
                        <StatusIcon className={`h-3 w-3 ${statusInfo.textColor} shrink-0`} />
                        
                        {/* KPI Name */}
                        <h3 className="text-xs font-normal text-white/90 flex-1 min-w-0">
                          {kpi.name}
                        </h3>

                        {/* Value */}
                        {kpi.v !== undefined && (
                          <div className="flex items-baseline gap-1 shrink-0">
                            <span className={`text-sm font-medium ${statusInfo.textColor}`}>
                              {kpi.v}
                            </span>
                            <span className="text-[9px] text-white/50">
                              {kpi.u || ''}
                            </span>
                          </div>
                        )}

                        {/* Optimal Range Badge */}
                        {kpi.r && (
                          <div className={`rounded ${statusInfo.badgeBg} px-1.5 py-0.5 shrink-0`}>
                            <span className={`text-[9px] font-normal ${statusInfo.badgeText}`}>
                              {kpi.r}
                            </span>
                          </div>
                        )}

                        {/* Expand Button */}
                        <button
                          onClick={() => toggleCard(kpi.id)}
                          className="text-white/40 hover:text-white/70 transition-colors shrink-0"
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>

                      {/* Expandable Details */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="pt-2 mt-2 border-t border-white/10 space-y-1.5">
                              {/* Description */}
                              <p className="text-[10px] text-white/60 leading-relaxed">
                                {kpi.d}
                              </p>
                              
                              {/* Formula */}
                              <div className="flex items-start gap-1.5">
                                <span className="text-[9px] text-white/40 shrink-0">Formula:</span>
                                <code className="text-[9px] text-cyan-400 font-mono">{kpi.f}</code>
                              </div>
                              
                              {/* Metrics */}
                              <div className="flex items-start gap-1.5">
                                <span className="text-[9px] text-white/40 shrink-0">Metrics:</span>
                                <span className="text-[9px] text-white/60">{kpi.m.join(', ')}</span>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}

        {/* Disclaimer */}
        <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-2 backdrop-blur-xl">
          <p className="text-[9px] text-yellow-300/90 leading-relaxed">
            <strong>⚠️ Important:</strong> These KPIs are AI-generated for informational purposes only. 
            Always consult with a qualified healthcare provider for medical interpretation and advice.
          </p>
        </div>
      </motion.div>
    </section>
  )
}
