'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ChevronLeft, Plus, Edit, Trash2, Save, X, Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Metric {
  key: string
  display_name: string
  unit: string
  category: string
  min_value: number | null
  max_value: number | null
  healthy_min_male: number | null
  healthy_max_male: number | null
  healthy_min_female: number | null
  healthy_max_female: number | null
  sort_order: number
}

interface EditingMetric extends Metric {
  isNew?: boolean
}

interface DatabaseMetric {
  metric: string
  unit: string
  count: number
  in_catalog: boolean
}

export default function AdminMetricsPage() {
  const router = useRouter()
  const [metrics, setMetrics] = useState<Metric[]>([])
  const [filteredMetrics, setFilteredMetrics] = useState<Metric[]>([])
  const [dbMetrics, setDbMetrics] = useState<DatabaseMetric[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingMetric, setEditingMetric] = useState<EditingMetric | null>(null)
  const [deleteKey, setDeleteKey] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [sortField, setSortField] = useState<keyof Metric>('sort_order')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [keySearch, setKeySearch] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    checkAdminAndFetch()
  }, [])

  useEffect(() => {
    if (metrics.length > 0) {
      fetchDatabaseMetrics()
    }
  }, [metrics])

  useEffect(() => {
    filterAndSortMetrics()
  }, [searchTerm, categoryFilter, sortField, sortDirection, metrics])

  const checkAdminAndFetch = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }

      // Check if user is admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single()

      if (!profile?.is_admin) {
        router.push('/protected/workouts')
        return
      }

      await fetchMetrics()
    } catch (err: any) {
      console.error('Error checking admin:', err)
      setError(err.message)
      setLoading(false)
    }
  }

  const fetchMetrics = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('metrics_catalog')
        .select('*')
        .order('sort_order', { ascending: true })

      if (fetchError) throw fetchError

      setMetrics(data || [])
    } catch (err: any) {
      console.error('Error fetching metrics:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchDatabaseMetrics = async () => {
    try {
      // Get all unique metrics from ALL users' measurements
      const { data, error } = await supabase
        .from('measurements')
        .select('metric, unit')

      if (error) throw error

      // Group by metric and count occurrences
      const metricMap = new Map<string, { unit: string; count: number }>()
      data?.forEach(m => {
        const existing = metricMap.get(m.metric)
        if (existing) {
          existing.count++
        } else {
          metricMap.set(m.metric, { unit: m.unit, count: 1 })
        }
      })

      // Convert to array and check if in catalog
      const dbMetricsList: DatabaseMetric[] = Array.from(metricMap.entries())
        .map(([metric, info]) => ({
          metric,
          unit: info.unit,
          count: info.count,
          in_catalog: metrics.some(m => m.key === metric)
        }))
        .filter(m => !m.in_catalog) // Only show metrics NOT in catalog
        .sort((a, b) => b.count - a.count) // Sort by usage count

      setDbMetrics(dbMetricsList)
    } catch (err: any) {
      console.error('Error fetching database metrics:', err)
    }
  }

  const filterAndSortMetrics = () => {
    let filtered = [...metrics]

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(m =>
        m.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.unit.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Apply category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(m => m.category === categoryFilter)
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aVal = a[sortField]
      let bVal = b[sortField]

      // Handle null values
      if (aVal === null) aVal = sortDirection === 'asc' ? Infinity : -Infinity
      if (bVal === null) bVal = sortDirection === 'asc' ? Infinity : -Infinity

      // Compare values
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc' 
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal)
      }
      
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal
      }

      return 0
    })

    setFilteredMetrics(filtered)
  }

  const handleSort = (field: keyof Metric) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      // New field, default to ascending
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const SortIcon = ({ field }: { field: keyof Metric }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3 w-3 text-white/30" />
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-3 w-3 text-emerald-400" />
      : <ArrowDown className="h-3 w-3 text-emerald-400" />
  }

  const categories = Array.from(new Set(metrics.map(m => m.category)))

  const handleAdd = () => {
    setEditingMetric({
      key: '',
      display_name: '',
      unit: '',
      category: 'composition',
      min_value: null,
      max_value: null,
      healthy_min_male: null,
      healthy_max_male: null,
      healthy_min_female: null,
      healthy_max_female: null,
      sort_order: metrics.length + 1,
      isNew: true
    })
    setKeySearch('')
    setShowSuggestions(false)
  }

  const selectDatabaseMetric = (dbMetric: DatabaseMetric) => {
    if (!editingMetric) return
    
    // Auto-fill fields from database metric
    const displayName = dbMetric.metric
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
    
    setEditingMetric({
      ...editingMetric,
      key: dbMetric.metric,
      display_name: displayName,
      unit: dbMetric.unit
    })
    setKeySearch(dbMetric.metric)
    setShowSuggestions(false)
  }

  const getFilteredDbMetrics = () => {
    if (!keySearch) return dbMetrics.slice(0, 10)
    
    return dbMetrics
      .filter(m => m.metric.toLowerCase().includes(keySearch.toLowerCase()))
      .slice(0, 10)
  }

  const handleEdit = (metric: Metric) => {
    setEditingMetric({ ...metric })
  }

  const handleSave = async () => {
    if (!editingMetric) return

    try {
      setActionLoading(true)
      setError(null)

      // Validate
      if (!editingMetric.key || !editingMetric.display_name || !editingMetric.unit) {
        throw new Error('Key, display name, and unit are required')
      }

      if (editingMetric.isNew) {
        // Insert new metric
        const { error: insertError } = await supabase
          .from('metrics_catalog')
          .insert({
            key: editingMetric.key,
            display_name: editingMetric.display_name,
            unit: editingMetric.unit,
            category: editingMetric.category,
            min_value: editingMetric.min_value,
            max_value: editingMetric.max_value,
            healthy_min_male: editingMetric.healthy_min_male,
            healthy_max_male: editingMetric.healthy_max_male,
            healthy_min_female: editingMetric.healthy_min_female,
            healthy_max_female: editingMetric.healthy_max_female,
            sort_order: editingMetric.sort_order
          })

        if (insertError) throw insertError
      } else {
        // Update existing metric
        const { error: updateError } = await supabase
          .from('metrics_catalog')
          .update({
            display_name: editingMetric.display_name,
            unit: editingMetric.unit,
            category: editingMetric.category,
            min_value: editingMetric.min_value,
            max_value: editingMetric.max_value,
            healthy_min_male: editingMetric.healthy_min_male,
            healthy_max_male: editingMetric.healthy_max_male,
            healthy_min_female: editingMetric.healthy_min_female,
            healthy_max_female: editingMetric.healthy_max_female,
            sort_order: editingMetric.sort_order
          })
          .eq('key', editingMetric.key)

        if (updateError) throw updateError
      }

      await fetchMetrics()
      setEditingMetric(null)
    } catch (err: any) {
      console.error('Error saving metric:', err)
      setError(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleDelete = async (key: string) => {
    try {
      setActionLoading(true)
      setError(null)

      const { error: deleteError } = await supabase
        .from('metrics_catalog')
        .delete()
        .eq('key', key)

      if (deleteError) throw deleteError

      await fetchMetrics()
      setDeleteKey(null)
    } catch (err: any) {
      console.error('Error deleting metric:', err)
      setError(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-fuchsia-500 border-t-transparent rounded-full"></div>
      </div>
    )
  }

  return (
    <section className="mx-auto w-full max-w-6xl px-2 pb-10">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-3"
      >
        {/* Title */}
        <div className="relative overflow-hidden rounded-lg border border-white/10 bg-white/5 p-3 backdrop-blur-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/protected/admin">
                <button className="p-1.5 rounded-lg bg-white/10 hover:bg-white/15 transition-colors">
                  <ChevronLeft className="h-4 w-4" />
                </button>
              </Link>
              <div>
                <h1 className="text-xl font-semibold">Metrics Catalog Management</h1>
                <p className="text-xs text-white/70">Manage available measurement types</p>
              </div>
            </div>
            <button
              onClick={handleAdd}
              className="flex items-center gap-2 rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs text-emerald-300 hover:bg-emerald-500/30 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Metric
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Filters */}
        <div className="relative overflow-hidden rounded-lg border border-white/10 bg-white/5 p-3 backdrop-blur-2xl">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
              <input
                type="text"
                placeholder="Search metrics..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 rounded-lg bg-white/10 text-sm text-white placeholder-white/40 focus:bg-white/15 focus:outline-none focus:ring-1 focus:ring-fuchsia-400/40"
              />
            </div>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 rounded-lg bg-white/10 text-sm text-white focus:bg-white/15 focus:outline-none focus:ring-1 focus:ring-fuchsia-400/40"
              style={{ colorScheme: 'dark' }}
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat} style={{ backgroundColor: '#1f2937' }}>
                  {cat}
                </option>
              ))}
            </select>

            <div className="text-xs text-white/50 flex items-center">
              {filteredMetrics.length} of {metrics.length} metrics
            </div>
          </div>
        </div>

        {/* Metrics Table */}
        <div className="relative overflow-hidden rounded-lg border border-white/10 bg-white/5 backdrop-blur-2xl">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left p-3 text-xs font-medium text-white/70">
                    <button
                      onClick={() => handleSort('key')}
                      className="flex items-center gap-1 hover:text-white transition-colors"
                    >
                      Key
                      <SortIcon field="key" />
                    </button>
                  </th>
                  <th className="text-left p-3 text-xs font-medium text-white/70">
                    <button
                      onClick={() => handleSort('display_name')}
                      className="flex items-center gap-1 hover:text-white transition-colors"
                    >
                      Display Name
                      <SortIcon field="display_name" />
                    </button>
                  </th>
                  <th className="text-left p-3 text-xs font-medium text-white/70">
                    <button
                      onClick={() => handleSort('unit')}
                      className="flex items-center gap-1 hover:text-white transition-colors"
                    >
                      Unit
                      <SortIcon field="unit" />
                    </button>
                  </th>
                  <th className="text-left p-3 text-xs font-medium text-white/70">
                    <button
                      onClick={() => handleSort('category')}
                      className="flex items-center gap-1 hover:text-white transition-colors"
                    >
                      Category
                      <SortIcon field="category" />
                    </button>
                  </th>
                  <th className="text-left p-3 text-xs font-medium text-white/70">Range</th>
                  <th className="text-center p-3 text-xs font-medium text-white/70">Male Healthy</th>
                  <th className="text-center p-3 text-xs font-medium text-white/70">Female Healthy</th>
                  <th className="text-left p-3 text-xs font-medium text-white/70">
                    <button
                      onClick={() => handleSort('sort_order')}
                      className="flex items-center gap-1 hover:text-white transition-colors"
                    >
                      Order
                      <SortIcon field="sort_order" />
                    </button>
                  </th>
                  <th className="text-right p-3 text-xs font-medium text-white/70">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMetrics.map((metric) => (
                  <tr key={metric.key} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="p-3 text-sm text-white/90 font-mono">{metric.key}</td>
                    <td className="p-3 text-sm text-white">{metric.display_name}</td>
                    <td className="p-3 text-sm text-white/70">{metric.unit}</td>
                    <td className="p-3 text-xs">
                      <span className="px-2 py-1 rounded bg-white/10 text-white/70">
                        {metric.category}
                      </span>
                    </td>
                    <td className="p-3 text-xs text-white/60">
                      {metric.min_value !== null && metric.max_value !== null
                        ? `${metric.min_value} - ${metric.max_value}`
                        : '—'}
                    </td>
                    <td className="p-3 text-xs text-center">
                      <div className="text-emerald-400">
                        {metric.healthy_min_male !== null && metric.healthy_max_male !== null
                          ? `${metric.healthy_min_male} - ${metric.healthy_max_male}`
                          : '—'}
                      </div>
                    </td>
                    <td className="p-3 text-xs text-center">
                      <div className="text-blue-400">
                        {metric.healthy_min_female !== null && metric.healthy_max_female !== null
                          ? `${metric.healthy_min_female} - ${metric.healthy_max_female}`
                          : '—'}
                      </div>
                    </td>
                    <td className="p-3 text-sm text-white/60">{metric.sort_order}</td>
                    <td className="p-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(metric)}
                          className="p-1.5 rounded bg-white/10 text-white/60 hover:bg-white/20 transition-colors"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteKey(metric.key)}
                          className="p-1.5 rounded bg-destructive/20 text-destructive hover:bg-destructive/30 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>

      {/* Edit/Add Modal */}
      {editingMetric && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative overflow-hidden rounded-lg border border-white/10 bg-gray-900 p-6 backdrop-blur-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <h3 className="text-lg font-semibold text-white mb-4">
              {editingMetric.isNew ? 'Add New Metric' : 'Edit Metric'}
            </h3>

            <div className="space-y-4">
              {/* Key with Autocomplete */}
              <div className="relative">
                <label className="block text-xs font-medium text-white/70 mb-1">
                  Key (unique identifier) *
                  {dbMetrics.length > 0 && editingMetric.isNew && (
                    <span className="ml-2 text-amber-400">({dbMetrics.length} metrics found in database)</span>
                  )}
                </label>
                <input
                  type="text"
                  value={editingMetric.isNew ? keySearch : editingMetric.key}
                  onChange={(e) => {
                    if (editingMetric.isNew) {
                      setKeySearch(e.target.value)
                      setEditingMetric({ ...editingMetric, key: e.target.value })
                      setShowSuggestions(true)
                    }
                  }}
                  onFocus={() => editingMetric.isNew && setShowSuggestions(true)}
                  disabled={!editingMetric.isNew}
                  placeholder="e.g., body_fat_percent or type to search database..."
                  className="w-full px-3 py-2 rounded-lg bg-white/10 text-sm text-white placeholder-white/40 focus:bg-white/15 focus:outline-none focus:ring-1 focus:ring-emerald-400/40 disabled:opacity-50 font-mono"
                />
                
                {/* Database Metrics Suggestions */}
                {editingMetric.isNew && showSuggestions && getFilteredDbMetrics().length > 0 && (
                  <div className="absolute z-10 mt-1 w-full max-h-60 overflow-y-auto rounded-lg bg-gray-800 border border-gray-600 shadow-xl">
                    <div className="px-3 py-2 text-xs text-amber-400 border-b border-white/10 bg-amber-500/10">
                      📊 Metrics from database (not in catalog)
                    </div>
                    {getFilteredDbMetrics().map((dbMetric) => (
                      <button
                        key={dbMetric.metric}
                        onClick={() => selectDatabaseMetric(dbMetric)}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-emerald-500/20 transition-colors border-b border-white/5 last:border-b-0"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="text-white font-medium font-mono">{dbMetric.metric}</div>
                            <div className="text-white/60 text-[10px]">{dbMetric.unit}</div>
                          </div>
                          <div className="text-amber-400 text-[10px]">
                            {dbMetric.count}x used
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Display Name */}
              <div>
                <label className="block text-xs font-medium text-white/70 mb-1">
                  Display Name *
                </label>
                <input
                  type="text"
                  value={editingMetric.display_name}
                  onChange={(e) => setEditingMetric({ ...editingMetric, display_name: e.target.value })}
                  placeholder="e.g., Body Fat %"
                  className="w-full px-3 py-2 rounded-lg bg-white/10 text-sm text-white placeholder-white/40 focus:bg-white/15 focus:outline-none focus:ring-1 focus:ring-emerald-400/40"
                />
              </div>

              {/* Unit & Category */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-white/70 mb-1">Unit *</label>
                  <input
                    type="text"
                    value={editingMetric.unit}
                    onChange={(e) => setEditingMetric({ ...editingMetric, unit: e.target.value })}
                    placeholder="e.g., %, kg, cm"
                    className="w-full px-3 py-2 rounded-lg bg-white/10 text-sm text-white placeholder-white/40 focus:bg-white/15 focus:outline-none focus:ring-1 focus:ring-emerald-400/40"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/70 mb-1">Category</label>
                  <input
                    type="text"
                    value={editingMetric.category}
                    onChange={(e) => setEditingMetric({ ...editingMetric, category: e.target.value })}
                    placeholder="e.g., composition"
                    className="w-full px-3 py-2 rounded-lg bg-white/10 text-sm text-white placeholder-white/40 focus:bg-white/15 focus:outline-none focus:ring-1 focus:ring-emerald-400/40"
                  />
                </div>
              </div>

              {/* Min & Max Values */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-white/70 mb-1">Min Value</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editingMetric.min_value ?? ''}
                    onChange={(e) => setEditingMetric({ ...editingMetric, min_value: e.target.value ? parseFloat(e.target.value) : null })}
                    placeholder="Optional"
                    className="w-full px-3 py-2 rounded-lg bg-white/10 text-sm text-white placeholder-white/40 focus:bg-white/15 focus:outline-none focus:ring-1 focus:ring-emerald-400/40"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/70 mb-1">Max Value</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editingMetric.max_value ?? ''}
                    onChange={(e) => setEditingMetric({ ...editingMetric, max_value: e.target.value ? parseFloat(e.target.value) : null })}
                    placeholder="Optional"
                    className="w-full px-3 py-2 rounded-lg bg-white/10 text-sm text-white placeholder-white/40 focus:bg-white/15 focus:outline-none focus:ring-1 focus:ring-emerald-400/40"
                  />
                </div>
              </div>

              {/* Healthy Ranges */}
              <div className="border-t border-white/10 pt-4 mt-4">
                <h4 className="text-sm font-medium text-white/90 mb-3">Healthy Reference Ranges</h4>
                <div className="space-y-3">
                  {/* Male Healthy Range */}
                  <div>
                    <label className="block text-xs font-medium text-emerald-400 mb-2">Male Healthy Range</label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        step="0.01"
                        value={editingMetric.healthy_min_male ?? ''}
                        onChange={(e) => setEditingMetric({ ...editingMetric, healthy_min_male: e.target.value ? parseFloat(e.target.value) : null })}
                        placeholder="Min"
                        className="px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-sm text-white placeholder-white/40 focus:bg-emerald-500/15 focus:outline-none focus:ring-1 focus:ring-emerald-400/40"
                      />
                      <input
                        type="number"
                        step="0.01"
                        value={editingMetric.healthy_max_male ?? ''}
                        onChange={(e) => setEditingMetric({ ...editingMetric, healthy_max_male: e.target.value ? parseFloat(e.target.value) : null })}
                        placeholder="Max"
                        className="px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-sm text-white placeholder-white/40 focus:bg-emerald-500/15 focus:outline-none focus:ring-1 focus:ring-emerald-400/40"
                      />
                    </div>
                  </div>

                  {/* Female Healthy Range */}
                  <div>
                    <label className="block text-xs font-medium text-blue-400 mb-2">Female Healthy Range</label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        step="0.01"
                        value={editingMetric.healthy_min_female ?? ''}
                        onChange={(e) => setEditingMetric({ ...editingMetric, healthy_min_female: e.target.value ? parseFloat(e.target.value) : null })}
                        placeholder="Min"
                        className="px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-sm text-white placeholder-white/40 focus:bg-blue-500/15 focus:outline-none focus:ring-1 focus:ring-blue-400/40"
                      />
                      <input
                        type="number"
                        step="0.01"
                        value={editingMetric.healthy_max_female ?? ''}
                        onChange={(e) => setEditingMetric({ ...editingMetric, healthy_max_female: e.target.value ? parseFloat(e.target.value) : null })}
                        placeholder="Max"
                        className="px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-sm text-white placeholder-white/40 focus:bg-blue-500/15 focus:outline-none focus:ring-1 focus:ring-blue-400/40"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Sort Order */}
              <div>
                <label className="block text-xs font-medium text-white/70 mb-1">Sort Order</label>
                <input
                  type="number"
                  value={editingMetric.sort_order}
                  onChange={(e) => setEditingMetric({ ...editingMetric, sort_order: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-lg bg-white/10 text-sm text-white focus:bg-white/15 focus:outline-none focus:ring-1 focus:ring-emerald-400/40"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setEditingMetric(null)}
                disabled={actionLoading}
                className="flex-1 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white/90 hover:bg-white/15 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={actionLoading}
                className="flex-1 rounded-lg bg-emerald-500/20 px-4 py-2 text-sm font-medium text-emerald-300 hover:bg-emerald-500/30 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {actionLoading ? (
                  <div className="animate-spin h-4 w-4 border-2 border-emerald-300 border-t-transparent rounded-full" />
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    {editingMetric.isNew ? 'Create' : 'Save'}
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative overflow-hidden rounded-lg border border-white/10 bg-gray-900 p-6 backdrop-blur-2xl max-w-md mx-4"
          >
            <h3 className="text-lg font-semibold text-white mb-2">Delete Metric?</h3>
            <p className="text-sm text-white/60 mb-2">
              Are you sure you want to delete <strong className="text-white">{deleteKey}</strong>?
            </p>
            <p className="text-xs text-destructive/80 mb-6">
              ⚠️ This will not delete existing measurements using this metric.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteKey(null)}
                disabled={actionLoading}
                className="flex-1 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white/90 hover:bg-white/15 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteKey)}
                disabled={actionLoading}
                className="flex-1 rounded-lg bg-destructive/20 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/30 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {actionLoading ? (
                  <div className="animate-spin h-4 w-4 border-2 border-destructive border-t-transparent rounded-full" />
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </section>
  )
}
