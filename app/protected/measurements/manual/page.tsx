'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Upload, ChevronLeft, Camera, FileImage, Loader2, CheckCircle, AlertCircle, Plus, Trash2, Save } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface MetricCatalog {
  key: string
  display_name: string
  unit: string
  category: string
  min_value: number | null
  max_value: number | null
}

interface ManualMeasurement {
  metric: string
  value: string
  unit: string
}

export default function ManualEntryPage() {
  const router = useRouter()
  const [metrics, setMetrics] = useState<MetricCatalog[]>([])
  const [measurements, setMeasurements] = useState<ManualMeasurement[]>([
    { metric: 'weight', value: '', unit: 'kg' }
  ])
  const [measurementDate, setMeasurementDate] = useState<string>(
    new Date().toISOString().split('T')[0] // Today's date in YYYY-MM-DD format
  )
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    fetchMetrics()
  }, [])

  const fetchMetrics = async () => {
    try {
      const { data, error } = await supabase
        .from('metrics_catalog')
        .select('*')
        .order('sort_order')

      if (error) throw error
      setMetrics(data || [])
    } catch (err: any) {
      console.error('Error fetching metrics:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const addMeasurement = () => {
    // Find first unused metric
    const usedMetrics = measurements.map(m => m.metric)
    const availableMetric = metrics.find(m => !usedMetrics.includes(m.key))
    
    if (availableMetric) {
      setMeasurements([...measurements, {
        metric: availableMetric.key,
        value: '',
        unit: availableMetric.unit
      }])
    }
  }

  const removeMeasurement = (index: number) => {
    setMeasurements(measurements.filter((_, i) => i !== index))
  }

  const updateMeasurement = (index: number, field: keyof ManualMeasurement, value: string) => {
    const updated = [...measurements]
    updated[index] = { ...updated[index], [field]: value }
    
    // Update unit when metric changes
    if (field === 'metric') {
      const metric = metrics.find(m => m.key === value)
      if (metric) {
        updated[index].unit = metric.unit
      }
    }
    
    setMeasurements(updated)
  }

  const validateMeasurements = (): string | null => {
    for (const measurement of measurements) {
      if (!measurement.value || measurement.value.trim() === '') {
        return 'Please fill in all measurement values'
      }

      const value = parseFloat(measurement.value)
      if (isNaN(value)) {
        return 'All values must be valid numbers'
      }

      const metric = metrics.find(m => m.key === measurement.metric)
      if (metric) {
        if (metric.min_value !== null && value < metric.min_value) {
          return `${metric.display_name} must be at least ${metric.min_value}`
        }
        if (metric.max_value !== null && value > metric.max_value) {
          return `${metric.display_name} must be at most ${metric.max_value}`
        }
      }
    }

    return null
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError(null)

      // Validate
      const validationError = validateMeasurements()
      if (validationError) {
        setError(validationError)
        setSaving(false)
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }

      // Prepare measurements for insert
      // Convert selected date to ISO timestamp
      const measuredAtTimestamp = new Date(measurementDate).toISOString()
      const measurementsToInsert = measurements.map(m => ({
        user_id: user.id,
        metric: m.metric,
        value: parseFloat(m.value),
        unit: m.unit,
        source: 'manual',
        measured_at: measuredAtTimestamp
      }))

      const { error: insertError } = await supabase
        .from('measurements')
        .insert(measurementsToInsert)

      if (insertError) throw insertError

      setSuccess(true)
      
      // Redirect after 2 seconds with refresh parameter
      setTimeout(() => {
        router.push('/protected/measurements?refresh=true')
      }, 2000)

    } catch (err: any) {
      console.error('Save error:', err)
      setError(err.message || 'Failed to save measurements')
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-fuchsia-500 border-t-transparent rounded-full"></div>
      </div>
    )
  }

  if (success) {
    return (
      <section className="mx-auto w-full max-w-3xl px-2 pb-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative overflow-hidden rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-8 backdrop-blur-2xl text-center"
        >
          <CheckCircle className="h-12 w-12 text-emerald-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">Success!</h3>
          <p className="text-sm text-white/60">Measurements saved. Redirecting...</p>
        </motion.div>
      </section>
    )
  }

  return (
    <section className="mx-auto w-full max-w-3xl px-2 pb-16">
      {/* Back Button */}
      <div className="mb-2">
        <Link href="/protected/measurements">
          <button className="flex items-center gap-1.5 rounded-lg border border-transparent bg-white/5 px-3 py-1.5 text-xs text-white/80 backdrop-blur-xl hover:bg-white/10 transition-colors">
            <ChevronLeft className="h-3.5 w-3.5" />
            Back
          </button>
        </Link>
      </div>

      {/* Title Container */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative overflow-hidden rounded-lg border border-transparent bg-white/5 p-3 backdrop-blur-2xl mb-3"
      >
        <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-white/10 blur-2xl opacity-50" />
        <div className="absolute -bottom-12 -left-12 h-32 w-32 rounded-full bg-fuchsia-500/20 blur-2xl opacity-30" />
        
        <div className="relative">
          <div className="flex items-center gap-2 mb-1">
            <Save className="h-5 w-5 text-white/90" />
            <h1 className="text-xl font-semibold tracking-tight">Manual Entry</h1>
          </div>
          <p className="text-xs text-white/70">Enter your body composition measurements manually</p>
        </div>
      </motion.div>

      {/* Error Display */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-3 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300"
        >
          {error}
        </motion.div>
      )}

      {/* Measurement Date */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="relative overflow-hidden rounded-lg border border-white/10 bg-white/5 p-4 backdrop-blur-2xl"
      >
        <label className="block text-xs font-light text-white/70 mb-2">Measurement Date</label>
        <input
          type="date"
          value={measurementDate}
          onChange={(e) => setMeasurementDate(e.target.value)}
          max={new Date().toISOString().split('T')[0]} // Can't select future dates
          className="w-full rounded-lg bg-white/10 backdrop-blur-xl px-3 py-2 text-sm text-white focus:bg-white/15 focus:outline-none focus:ring-1 focus:ring-fuchsia-400/40"
        />
        <p className="text-xs text-white/50 mt-1">When were these measurements taken?</p>
      </motion.div>

      {/* Measurements Form - Compact Container */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="relative overflow-hidden rounded-lg border border-white/10 bg-white/5 backdrop-blur-2xl mb-4"
      >
        <div className="p-3">
          <div className="space-y-2">
            {measurements.map((measurement, index) => (
              <div
                key={index}
                className="flex items-center gap-2 rounded-lg bg-white/5 p-2 hover:bg-white/10 transition-colors"
              >
                {/* Metric Selector - Simple */}
                <select
                  value={measurement.metric}
                  onChange={(e) => updateMeasurement(index, 'metric', e.target.value)}
                  className="flex-1 rounded-md bg-white/10 backdrop-blur-xl border border-white/20 px-2 py-1.5 text-xs text-white hover:border-white/30 focus:bg-white/15 focus:outline-none focus:ring-1 focus:ring-fuchsia-400/40 cursor-pointer"
                  style={{ colorScheme: 'dark' }}
                >
                  {metrics.map((metric) => (
                    <option 
                      key={metric.key} 
                      value={metric.key}
                      className="bg-slate-800 text-white hover:bg-slate-700"
                    >
                      {metric.display_name}
                    </option>
                  ))}
                </select>

                {/* Value Input - Compact */}
                <input
                  type="number"
                  step="0.1"
                  value={measurement.value}
                  onChange={(e) => updateMeasurement(index, 'value', e.target.value)}
                  placeholder="0.0"
                  className="w-20 rounded-md bg-white/10 backdrop-blur-xl px-2 py-1.5 text-xs text-white placeholder-white/40 focus:bg-white/15 focus:outline-none focus:ring-1 focus:ring-fuchsia-400/40"
                />

                {/* Unit Display - Compact */}
                <div className="w-12 rounded-md bg-white/5 px-2 py-1.5 text-xs text-white/60 text-center">
                  {measurement.unit}
                </div>

                {/* Delete Button */}
                {measurements.length > 1 && (
                  <button
                    onClick={() => removeMeasurement(index)}
                    className="p-1.5 rounded-md bg-red-500/10 text-red-300 hover:bg-red-500/20 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
          {/* Add Measurement Button - Inside Container */}
          {measurements.length < metrics.length && (
            <button
              onClick={addMeasurement}
              className="w-full mt-2 rounded-md border border-white/10 bg-white/5 p-2 text-xs text-white/70 hover:bg-white/10 hover:text-white/90 transition-colors flex items-center justify-center gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Another Measurement
            </button>
          )}
        </div>
      </motion.div>

      {/* Save Button */}
      <div className="flex gap-3 mt-4">
        <Link href="/protected/measurements" className="flex-1">
          <button className="w-full rounded-lg bg-white/10 px-4 py-2.5 text-sm font-medium text-white/90 hover:bg-white/15 transition-colors">
            Cancel
          </button>
        </Link>
        <button
          onClick={handleSave}
          disabled={saving || measurements.length === 0}
          className="flex-1 rounded-lg bg-white/10 px-4 py-2.5 text-sm font-medium text-white/90 hover:bg-white/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <div className="animate-spin h-4 w-4 border-2 border-white/60 border-t-transparent rounded-full"></div>
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save Measurements
            </>
          )}
        </button>
      </div>
    </section>
  )
}
