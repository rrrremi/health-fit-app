'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Search, Plus, Check } from 'lucide-react'
import { fuzzyFilter, fuzzyMatch } from '@/lib/fuzzy-search'

export interface MetricCatalog {
  key: string
  display_name: string
  unit: string
  category: string
  min_value: number | null
  max_value: number | null
}

interface MetricPickerProps {
  isOpen: boolean
  onClose: () => void
  onMetricSelected: (metric: MetricCatalog) => void
  metrics: MetricCatalog[]
  selectedMetricKeys: string[] // Keys of already-selected metrics
}

// Category display names for better UX
const CATEGORY_LABELS: Record<string, string> = {
  all: 'All Categories',
  composition: 'Body Composition',
  blood_lipids: 'Cholesterol & Lipids',
  blood_sugar: 'Blood Sugar',
  blood_cells: 'Blood Cells',
  vitals: 'Vitals',
  liver: 'Liver Function',
  kidney: 'Kidney Function',
  thyroid: 'Thyroid',
  vitamins: 'Vitamins & Minerals',
  segmental_lean: 'Lean Mass (Segments)',
  segmental_fat: 'Fat Mass (Segments)',
  water: 'Body Water',
  obesity: 'Obesity Metrics',
  control: 'Control Targets',
  energy: 'Energy & Caloric',
  targets: 'Body Targets',
  performance: 'Performance Scores',
  segmental_analysis: 'Segment Analysis',
  impedance: 'Impedance (Advanced)'
}

export default function MetricPicker({
  isOpen,
  onClose,
  onMetricSelected,
  metrics,
  selectedMetricKeys
}: MetricPickerProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const searchInputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Extract unique categories from metrics
  const categories = useMemo(() => {
    const uniqueCategories = Array.from(new Set(metrics.map(m => m.category)))
    return ['all', ...uniqueCategories.sort()]
  }, [metrics])

  // Filter metrics by category and search query
  const filteredMetrics = useMemo(() => {
    let filtered = metrics

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(m => m.category === selectedCategory)
    }

    // Filter by search query using fuzzy matching
    if (searchQuery) {
      filtered = fuzzyFilter(
        filtered,
        searchQuery,
        (metric) => metric.display_name
      )
    }

    return filtered
  }, [metrics, selectedCategory, searchQuery])

  // Group filtered metrics by category for display
  const groupedMetrics = useMemo(() => {
    const groups: Record<string, MetricCatalog[]> = {}
    
    filteredMetrics.forEach(metric => {
      const category = metric.category || 'other'
      if (!groups[category]) {
        groups[category] = []
      }
      groups[category].push(metric)
    })

    return groups
  }, [filteredMetrics])

  // Auto-focus search input when panel opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100)
    }
  }, [isOpen])

  // Reset state when panel closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('')
      setSelectedCategory('all')
    }
  }, [isOpen])

  const handleMetricClick = (metric: MetricCatalog) => {
    // Don't add if already selected
    if (selectedMetricKeys.includes(metric.key)) return
    
    onMetricSelected(metric)
    // Keep panel open for multiple selections
  }

  const isMetricSelected = (metricKey: string) => {
    return selectedMetricKeys.includes(metricKey)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          {/* Slide-over Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-[420px] bg-white/5 backdrop-blur-xl border-l border-transparent shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-transparent">
              <h2 className="text-base font-medium text-white/90 tracking-wide">Add Metric</h2>
              <button
                onClick={onClose}
                className="p-1.5 rounded-md hover:bg-white/10 transition-colors"
              >
                <X className="h-4 w-4 text-white/60" strokeWidth={1.5} />
              </button>
            </div>

            {/* Search Bar */}
            <div className="p-4 border-b border-transparent">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" strokeWidth={1.5} />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search metrics"
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-white/20 bg-white/10 text-white/90 placeholder-white/40 text-sm focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-fuchsia-400/40 backdrop-blur-xl transition-colors"
                />
              </div>
            </div>

            {/* Category Filter */}
            <div className="px-4 py-3 border-b border-transparent">
              <div className="text-[10px] text-white/50 uppercase tracking-wider mb-2 font-medium">Category</div>
              <div className="flex gap-2 overflow-x-auto scrollbar-thin pb-1">
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`
                      px-3 py-1.5 rounded-full text-xs font-light whitespace-nowrap transition-all border
                      ${selectedCategory === category
                        ? 'border-white/30 bg-white/20 text-white/90'
                        : 'border-white/15 bg-white/5 text-white/60 hover:bg-white/10 hover:border-white/20'
                      }
                    `}
                  >
                    {CATEGORY_LABELS[category] || category.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Metrics List */}
            <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
              {filteredMetrics.length === 0 ? (
                <div className="text-center py-12 text-white/40 text-sm font-light">
                  {searchQuery ? 'No metrics found matching your search' : 'No metrics available'}
                </div>
              ) : (
                <>
                  {Object.entries(groupedMetrics).map(([category, categoryMetrics]) => (
                    <div key={category}>
                      {/* Category Header (only show if not filtering by category) */}
                      {selectedCategory === 'all' && (
                        <div className="px-2 py-1.5 text-xs font-semibold text-white/70 uppercase tracking-wide mb-1.5">
                          {CATEGORY_LABELS[category] || category.replace(/_/g, ' ')}
                        </div>
                      )}
                      
                      {/* Metrics in this category */}
                      <div className="space-y-1.5">
                        {categoryMetrics.map((metric) => {
                          const isSelected = isMetricSelected(metric.key)
                          
                          return (
                            <div
                              key={metric.key}
                              className={`
                                group p-2 rounded-lg border transition-all backdrop-blur-xl
                                ${isSelected
                                  ? 'border-fuchsia-500/30 bg-fuchsia-500/10'
                                  : 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 cursor-pointer'
                                }
                              `}
                              onClick={() => !isSelected && handleMetricClick(metric)}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex-1 min-w-0 flex items-center gap-2">
                                  <h4 className="text-xs font-light text-white/90 truncate">
                                    {metric.display_name}
                                  </h4>
                                  <span className="text-[11px] text-white/50 font-light whitespace-nowrap">
                                    ({metric.unit})
                                  </span>
                                </div>
                                <div className="flex-shrink-0">
                                  {isSelected ? (
                                    <div className="h-5 w-5 rounded-full bg-fuchsia-500/20 border border-fuchsia-500/40 flex items-center justify-center">
                                      <Check className="h-3 w-3 text-fuchsia-300" strokeWidth={2} />
                                    </div>
                                  ) : (
                                    <button
                                      className="h-5 w-5 rounded-full border border-white/20 bg-white/5 hover:bg-white/15 hover:border-white/30 flex items-center justify-center transition-all backdrop-blur-xl group-hover:border-white/30"
                                    >
                                      <Plus className="h-3 w-3 text-white/60 group-hover:text-white/80" strokeWidth={2} />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>

            {/* Footer with count */}
            {selectedMetricKeys.length > 0 && (
              <div className="p-3 border-t border-transparent">
                <div className="text-xs text-white/50 text-center">
                  {selectedMetricKeys.length} metric{selectedMetricKeys.length !== 1 ? 's' : ''} selected
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
