'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Scale, Upload, Plus, Search, Filter, ChevronDown, ChevronUp, X, ArrowUpDown, ArrowUp, ArrowDown, Activity } from 'lucide-react'
import { useMeasurementsSummary } from '@/hooks/useMeasurementsSummary'
import { MetricCard } from '@/components/measurements/MetricCard'
import { ErrorBoundary } from '@/components/ErrorBoundary'

// Date filter options (defined outside component to avoid recreation)
const DATE_FILTER_OPTIONS = [
  { id: 'all' as const, label: 'All Time' },
  { id: 'today' as const, label: 'Today' },
  { id: 'week' as const, label: 'Last 7 Days' },
  { id: 'month' as const, label: 'Last 30 Days' },
  { id: 'custom' as const, label: 'Custom Range' }
]

function MeasurementsPageContent() {
  const { data, isLoading, error } = useMeasurementsSummary()

  // Filter and sort state - ALL HOOKS MUST BE AT THE TOP
  const [searchTerm, setSearchTerm] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all')
  const [customDateFrom, setCustomDateFrom] = useState('')
  const [customDateTo, setCustomDateTo] = useState('')
  const [sortField, setSortField] = useState<'name' | 'date'>('name')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [isGeneratingAnalysis, setIsGeneratingAnalysis] = useState(false)

  // Get unique categories from the data
  const availableCategories = useMemo(() => {
    if (!data?.metrics) return []

    // Filter out metrics without category field (migration not run yet)
    const metricsWithCategories = data.metrics.filter(m => m.category)
    if (metricsWithCategories.length === 0) return []

    const categorySet = new Set(metricsWithCategories.map(m => m.category))

    // Use categories as-is from database, just format for display
    return Array.from(categorySet)
      .filter(cat => cat) // Remove undefined/null
      .map(cat => ({
        id: cat,
        label: cat.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
      }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [data?.metrics])

  // Filter and sort metrics
  const filteredAndSortedMetrics = useMemo(() => {
    if (!data?.metrics) return []

    let filtered = data.metrics.filter(metric => {
      // Filter by search term
      const matchesSearch = !searchTerm ||
        metric.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        metric.metric.toLowerCase().includes(searchTerm.toLowerCase())

      // Filter by category (use actual category from catalog)
      const matchesCategory = selectedCategories.length === 0 ||
        (metric.category && selectedCategories.includes(metric.category))

      // Filter by date
      let matchesDate = true
      if (dateFilter !== 'all') {
        const metricDate = new Date(metric.latest_date)
        const now = new Date()

        if (dateFilter === 'today') {
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          matchesDate = metricDate >= today
        } else if (dateFilter === 'week') {
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          matchesDate = metricDate >= weekAgo
        } else if (dateFilter === 'month') {
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          matchesDate = metricDate >= monthAgo
        } else if (dateFilter === 'custom' && (customDateFrom || customDateTo)) {
          if (customDateFrom) {
            matchesDate = matchesDate && metricDate >= new Date(customDateFrom)
          }
          if (customDateTo) {
            const toDate = new Date(customDateTo)
            toDate.setHours(23, 59, 59, 999)
            matchesDate = matchesDate && metricDate <= toDate
          }
        }
      }

      return matchesSearch && matchesCategory && matchesDate
    })

    // Sort metrics
    filtered.sort((a, b) => {
      let comparison = 0

      if (sortField === 'name') {
        comparison = a.display_name.localeCompare(b.display_name)
      } else if (sortField === 'date') {
        comparison = new Date(a.latest_date).getTime() - new Date(b.latest_date).getTime()
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })

    return filtered
  }, [data?.metrics, searchTerm, selectedCategories, dateFilter, customDateFrom, customDateTo, sortField, sortDirection])

  // Computed values
  const hasMetrics = data?.metrics && data.metrics.length > 0
  const hasActiveFilters = searchTerm || selectedCategories.length > 0 || dateFilter !== 'all'

  // Early returns AFTER all hooks
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-white border-t-transparent rounded-full"></div>
      </div>
    )
  }

  if (error) {
    return (
      <section className="mx-auto w-full max-w-3xl px-2 pb-10">
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
          Error loading measurements. Please try again.
        </div>
      </section>
    )
  }

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    )
  }

  const toggleSort = (field: 'name' | 'date') => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const clearFilters = () => {
    setSearchTerm('')
    setSelectedCategories([])
    setDateFilter('all')
    setCustomDateFrom('')
    setCustomDateTo('')
  }

  const handleGenerateAnalysis = async () => {
    setIsGeneratingAnalysis(true)
    try {
      const response = await fetch('/api/measurements/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to generate analysis')
      }

      const result = await response.json()

      // Redirect to analysis page
      window.location.href = `/protected/measurements/analysis/${result.analysis_id}`
    } catch (error: any) {
      console.error('Error generating analysis:', error)
      alert(error.message || 'Failed to generate analysis')
    } finally {
      setIsGeneratingAnalysis(false)
    }
  }

  const SortIcon = ({ field }: { field: 'name' | 'date' }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3 w-3 text-white/30" />
    }
    return sortDirection === 'asc'
      ? <ArrowUp className="h-3 w-3 text-emerald-400" />
      : <ArrowDown className="h-3 w-3 text-emerald-400" />
  }

  return (
    <section className="mx-auto w-full max-w-3xl px-2 pb-10">
      {/* Action Buttons */}
      <div className="mb-2 flex items-center justify-between relative z-10">
        <div></div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleGenerateAnalysis}
            disabled={isGeneratingAnalysis || !hasMetrics}
            className="flex items-center gap-1 rounded-lg border border-transparent bg-white/5 px-3 py-1.5 text-xs text-white/80 backdrop-blur-xl hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Activity className="h-3.5 w-3.5" />
            {isGeneratingAnalysis ? 'Analyzing...' : 'Analysis'}
          </button>
          <Link href="/protected/measurements/upload">
            <button className="flex items-center gap-1 rounded-lg border border-transparent bg-white/5 px-3 py-1.5 text-xs text-white/80 backdrop-blur-xl hover:bg-white/10 transition-colors">
              <Upload className="h-3.5 w-3.5" />
              Upload
            </button>
          </Link>
          <Link href="/protected/measurements/manual">
            <button className="flex items-center gap-1 rounded-lg border border-transparent bg-white/5 px-3 py-1.5 text-xs text-white/80 backdrop-blur-xl hover:bg-white/10 transition-colors">
              <Plus className="h-3.5 w-3.5" />
              Manual
            </button>
          </Link>
        </div>
      </div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-3"
      >
        {/* Title */}
        <div className="relative overflow-hidden rounded-lg border border-transparent bg-white/5 p-3 backdrop-blur-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-white/70" />
              <div>
                <h1 className="text-xl font-semibold">Your Measurements</h1>
                <p className="text-xs text-white/70">Track your body composition and health metrics</p>
              </div>
            </div>
          </div>
        </div>

        {/* Empty State */}
        {!hasMetrics && (
          <div className="rounded-lg border border-transparent bg-white/5 p-8 text-center backdrop-blur-2xl">
            <Scale className="h-12 w-12 mx-auto text-white/30 mb-3" />
            <h3 className="text-lg font-medium text-white mb-2">No measurements yet</h3>
            <p className="text-sm text-white/60 mb-4">
              Upload an InBody report or add measurements manually to get started
            </p>
          </div>
        )}

        {/* Metrics Grid */}
        {hasMetrics && (
          <div className="space-y-3">
            {/* Search and Filter Controls */}
            <div className="rounded-lg border border-transparent bg-white/5 backdrop-blur-xl overflow-hidden">
              <div className="p-2 border-b border-transparent">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-white/40" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search metrics"
                        className="w-32 rounded-md border border-white/20 bg-white/10 py-1 pl-6 pr-2 text-xs font-light text-white/90 placeholder-white/40 focus:border-white/40 focus:outline-none backdrop-blur-xl"
                      />
                    </div>
                    {hasActiveFilters && (
                      <button
                        onClick={clearFilters}
                        className="flex items-center gap-1 rounded-md border border-white/20 bg-white/10 px-2 py-1 text-xs font-light text-white/80 hover:bg-white/20 transition-colors"
                      >
                        <X className="h-3 w-3" strokeWidth={1.5} />
                      </button>
                    )}
                    <button
                      onClick={() => setShowFilters(!showFilters)}
                      className="flex items-center gap-1 rounded-md border border-white/20 bg-white/10 px-2 py-1 text-xs font-light text-white/80 hover:bg-white/20 transition-colors"
                    >
                      <Filter className="h-3 w-3" strokeWidth={1.5} />
                      <span className="hidden sm:inline">Filter</span>
                      {showFilters ? (
                        <ChevronUp className="h-3 w-3" strokeWidth={1.5} />
                      ) : (
                        <ChevronDown className="h-3 w-3" strokeWidth={1.5} />
                      )}
                    </button>
                  </div>

                  {/* Sort buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => toggleSort('name')}
                      className="flex items-center gap-1 rounded-md border border-white/20 bg-white/10 px-2 py-1 text-xs font-light text-white/80 hover:bg-white/20 transition-colors"
                    >
                      Name
                      <SortIcon field="name" />
                    </button>
                    <button
                      onClick={() => toggleSort('date')}
                      className="flex items-center gap-1 rounded-md border border-white/20 bg-white/10 px-2 py-1 text-xs font-light text-white/80 hover:bg-white/20 transition-colors"
                    >
                      Date
                      <SortIcon field="date" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Filter Panel */}
              {showFilters && (
                <div className="p-3 border-t border-white/10 bg-white/5">
                  <div className="space-y-4">
                    {/* Date Filter */}
                    <div>
                      <p className="text-xs font-medium text-white/70 mb-2">Date Added</p>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {DATE_FILTER_OPTIONS.map(option => (
                          <button
                            key={option.id}
                            onClick={() => setDateFilter(option.id)}
                            className={`px-2 py-1 rounded-md text-xs transition-colors ${
                              dateFilter === option.id
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-white/10 text-white/70 border border-white/20 hover:bg-white/20'
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>

                      {/* Custom Date Range Inputs */}
                      {dateFilter === 'custom' && (
                        <div className="flex gap-2 mt-2">
                          <div className="flex-1">
                            <label className="text-[10px] text-white/50 mb-1 block">From</label>
                            <input
                              type="date"
                              value={customDateFrom}
                              onChange={(e) => setCustomDateFrom(e.target.value)}
                              className="w-full rounded bg-white/10 px-2 py-1 text-xs text-white focus:bg-white/15 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="text-[10px] text-white/50 mb-1 block">To</label>
                            <input
                              type="date"
                              value={customDateTo}
                              onChange={(e) => setCustomDateTo(e.target.value)}
                              className="w-full rounded bg-white/10 px-2 py-1 text-xs text-white focus:bg-white/15 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Category Filter */}
                    <div>
                      <p className="text-xs font-medium text-white/70 mb-2">Categories</p>
                      {availableCategories.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {availableCategories.map(category => (
                            <button
                              key={category.id}
                              onClick={() => toggleCategory(category.id)}
                              className={`px-2 py-1 rounded-md text-xs transition-colors ${
                                selectedCategories.includes(category.id)
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-white/10 text-white/70 border border-white/20 hover:bg-white/20'
                              }`}
                            >
                              {category.label}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-white/40 italic">
                          Run database migration to enable category filtering
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Results count */}
            <div className="flex items-center justify-between">
              <p className="text-xs text-white/60">
                {filteredAndSortedMetrics.length} of {data.metrics.length} {filteredAndSortedMetrics.length === 1 ? 'metric' : 'metrics'}
              </p>
              {data.query_time_ms && (
                <p className="text-xs text-white/40">
                  Loaded in {data.query_time_ms}ms
                </p>
              )}
            </div>

            {/* Metrics list */}
            {filteredAndSortedMetrics.length > 0 ? (
              <div className="grid gap-3">
                {filteredAndSortedMetrics.map((metric) => (
                  <MetricCard key={metric.metric} metric={metric} />
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-transparent bg-white/5 p-8 text-center backdrop-blur-2xl">
                <Search className="h-12 w-12 mx-auto text-white/30 mb-3" />
                <h3 className="text-lg font-medium text-white mb-2">No metrics found</h3>
                <p className="text-sm text-white/60 mb-4">
                  Try adjusting your search or filters
                </p>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </motion.div>
    </section>
  )
}

export default function MeasurementsPage() {
  return (
    <ErrorBoundary>
      <MeasurementsPageContent />
    </ErrorBoundary>
  )
}
