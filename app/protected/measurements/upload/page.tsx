'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Upload, ChevronLeft, Camera, FileImage, Loader2, CheckCircle, AlertCircle, Plus, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { normalizeMetricName, validateMetricName as validateMetricNameUtil } from '@/lib/metric-normalization-client'
import { toast } from '@/lib/toast'

type UploadStep = 'select' | 'uploading' | 'processing' | 'review' | 'saving' | 'success'

interface ExtractedMeasurement {
  metric: string
  value: number
  unit: string
  confidence?: number
  raw_text?: string
  normalized_from?: string
}

interface PotentialDuplicate {
  extracted: { metric: string; value: number; unit: string; index: number };
  existing: { metric: string; display_name: string; latest_value: number; unit: string };
  similarity: number;
  confidence: 'high' | 'medium' | 'low';
}

interface AvailableMetric {
  key: string;
  display_name: string;
  unit: string;
  category: string;
  validation: {
    min: number | null;
    max: number | null;
  };
}

export default function UploadMeasurementPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<UploadStep>('select')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [extractedData, setExtractedData] = useState<ExtractedMeasurement[]>([])
  const [duplicates, setDuplicates] = useState<PotentialDuplicate[]>([])
  const [warnings, setWarnings] = useState<string[]>([])
  const [measurementDate, setMeasurementDate] = useState<string>(
    new Date().toISOString().split('T')[0] // Today's date in YYYY-MM-DD format
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showFullscreen, setShowFullscreen] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newMetric, setNewMetric] = useState('')
  const [newValue, setNewValue] = useState('')
  const [newUnit, setNewUnit] = useState('')
  const [addErrors, setAddErrors] = useState<string[]>([])
  const [availableMetrics, setAvailableMetrics] = useState<AvailableMetric[]>([])
  const [metricsLoading, setMetricsLoading] = useState(false)
  const supabase = createClient()

  // Fetch available metrics on component mount
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setMetricsLoading(true)
        const response = await fetch('/api/measurements/catalog')
        const data = await response.json()

        if (response.ok && data.metrics) {
          setAvailableMetrics(data.metrics)
        } else {
          console.error('Failed to fetch metrics:', data.error)
        }
      } catch (error) {
        console.error('Error fetching metrics:', error)
      } finally {
        setMetricsLoading(false)
      }
    }

    fetchMetrics()
  }, [])

  // Validation constants
  const VALID_UNITS = [
    'kg', '%', 'cm', 'kcal', 'level', 'L', 'ratio', 'points', 'grade', 'Ω',
    'mmol/L', 'g/dL', 'mmHg', 'bpm', 'IU/L', 'ng/mL', 'pg/mL'
  ]

  // Validation functions
  const validateNewMeasurement = (): string[] => {
    const errors: string[] = []

    if (!newMetric) errors.push('Please select a metric')

    if (!newValue) errors.push('Value is required')
    if (isNaN(parseFloat(newValue))) errors.push('Value must be a number')

    // Find the selected metric to get its validation ranges
    const selectedMetricData = availableMetrics.find(m => m.key === newMetric)
    if (selectedMetricData) {
      const numValue = parseFloat(newValue)
      const { min, max } = selectedMetricData.validation

      if (min !== null && numValue < min) {
        errors.push(`Value ${numValue} is below minimum (${min}) for ${selectedMetricData.display_name}`)
      }
      if (max !== null && numValue > max) {
        errors.push(`Value ${numValue} is above maximum (${max}) for ${selectedMetricData.display_name}`)
      }
    }

    // Check for duplicates in current list
    const exists = extractedData.some(m => m.metric === newMetric)
    if (exists) errors.push('This measurement already exists in the list')

    return errors
  }

  const validateMetricName = (name: string): boolean => {
    if (!name || typeof name !== 'string') return false
    const normalized = normalizeMetricName(name)
    return normalized.length > 0 && normalized.length <= 50
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('Image must be less than 10MB')
      return
    }

    setSelectedFile(file)
    setError(null)

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    try {
      setStep('uploading')
      setError(null)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }

      // Server-side validation before upload
      const validationPayload = {
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        fileType: selectedFile.type
      }
      console.log('Sending validation payload:', validationPayload)
      
      const validationResponse = await fetch('/api/measurements/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validationPayload)
      })

      if (!validationResponse.ok) {
        const validationError = await validationResponse.json()
        console.error('Validation error details:', validationError)
        const errorMessage = validationError.details 
          ? `${validationError.error}: ${validationError.details.join(', ')}`
          : validationError.error || 'File validation failed'
        throw new Error(errorMessage)
      }

      const { fileName: validatedFileName } = await validationResponse.json()

      // Upload to Supabase Storage with validated filename
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('measurement-images')
        .upload(validatedFileName, selectedFile, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('measurement-images')
        .getPublicUrl(validatedFileName)

      setImageUrl(publicUrl)

      // Extract measurements using OpenAI
      setStep('processing')
      await extractMeasurements(publicUrl)

    } catch (err: any) {
      console.error('Upload error:', err)
      setError(err.message || 'Failed to upload image')
      setStep('select')
    }
  }

  const extractMeasurements = async (imageUrl: string) => {
    try {
      const response = await fetch('/api/measurements/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl })
      })

      const data = await response.json()

      if (!response.ok) {
        // Show detailed error from API
        console.error('API Error Response:', data)
        throw new Error(data.error || 'Failed to extract measurements')
      }

      setExtractedData(data.measurements || [])
      setDuplicates(data.duplicates || [])
      setWarnings(data.warnings || [])
      setStep('review')

    } catch (err: any) {
      console.error('=== FRONTEND EXTRACTION ERROR ===')
      console.error('Error:', err)
      console.error('================================')
      
      // Show user-friendly error message
      const errorMessage = err.message || 'Failed to extract measurements. Please try manual entry.'
      setError(errorMessage)
      setStep('select')
    }
  }

  const handleSave = async () => {
    try {
      setStep('saving')
      setError(null)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }

      // Prepare measurements for insert
      // Convert selected date to ISO timestamp
      const measuredAtTimestamp = new Date(measurementDate).toISOString()
      const measurements = extractedData.map(m => ({
        user_id: user.id,
        metric: m.metric,
        value: m.value,
        unit: m.unit,
        source: 'ocr',
        confidence: m.confidence,
        image_url: imageUrl,
        measured_at: measuredAtTimestamp
      }))

      const { error: insertError } = await supabase
        .from('measurements')
        .insert(measurements)

      if (insertError) throw insertError

      setStep('success')
      toast.success('Measurements saved successfully')
      
      // Redirect after 1.5 seconds with refresh parameter
      setTimeout(() => {
        router.push('/protected/measurements?refresh=true')
      }, 1500)

    } catch (err: unknown) {
      const message = (err as Error).message || 'Failed to save measurements'
      setError(message)
      toast.error(message)
      setStep('review')
    }
  }

  const handleValueChange = (index: number, newValue: number) => {
    setExtractedData(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], value: newValue }
      return updated
    })
  }

  const handleAddMeasurement = () => {
    const errors = validateNewMeasurement()
    if (errors.length > 0) {
      setAddErrors(errors)
      return
    }

    // Find the selected metric data
    const selectedMetricData = availableMetrics.find(m => m.key === newMetric)
    if (!selectedMetricData) {
      setAddErrors(['Selected metric not found'])
      return
    }

    const newMeasurement: ExtractedMeasurement = {
      metric: selectedMetricData.key,
      value: parseFloat(newValue),
      unit: selectedMetricData.unit,
      confidence: undefined, // Mark as manually added
      raw_text: undefined,
      normalized_from: undefined
    }

    setExtractedData(prev => [...prev, newMeasurement])
    setNewMetric('')
    setNewValue('')
    setNewUnit('')
    setAddErrors([])
    setShowAddForm(false)
  }

  const handleRemoveMeasurement = (index: number) => {
    setExtractedData(prev => prev.filter((_, i) => i !== index))
  }

  return (
    <section className="mx-auto w-full max-w-3xl px-2 pb-10">
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
        <div className="absolute -bottom-12 -left-12 h-32 w-32 rounded-full bg-emerald-500/20 blur-2xl opacity-30" />
        
        <div className="relative">
          <div className="flex items-center gap-2 mb-1">
            <Upload className="h-5 w-5 text-white/90" />
            <h1 className="text-xl font-semibold tracking-tight">Upload Report</h1>
          </div>
          <p className="text-xs text-white/70">Upload your InBody or body composition report</p>
        </div>
      </motion.div>

      {/* Error Display */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-3 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive flex items-center gap-2"
        >
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </motion.div>
      )}

      {/* Upload Section */}
      {step === 'select' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="relative overflow-hidden rounded-lg border border-white/10 bg-white/5 p-6 backdrop-blur-2xl"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileSelect}
            className="hidden"
          />

          {!selectedFile ? (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-white/10">
                <FileImage className="h-10 w-10 text-white/60" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Select an Image</h3>
              <p className="text-sm text-white/60 mb-6">
                Take a photo or upload an existing image of your body composition report
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-500/20 px-4 py-2 text-sm font-medium text-emerald-300 hover:bg-emerald-500/30 transition-colors"
                >
                  <Camera className="h-4 w-4" />
                  Take Photo
                </button>
                <button
                  onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.removeAttribute('capture')
                      fileInputRef.current.click()
                    }
                  }}
                  className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white/90 hover:bg-white/15 transition-colors"
                >
                  <Upload className="h-4 w-4" />
                  Upload File
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="mb-4">
                <img
                  src={previewUrl!}
                  alt="Preview"
                  className="w-full rounded-lg max-h-96 object-contain bg-black/20"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setSelectedFile(null)
                    setPreviewUrl(null)
                  }}
                  className="flex-1 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white/90 hover:bg-white/15 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpload}
                  className="flex-1 rounded-lg bg-emerald-500/20 px-4 py-2 text-sm font-medium text-emerald-300 hover:bg-emerald-500/30 transition-colors"
                >
                  Extract Data
                </button>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Processing State */}
      {(step === 'uploading' || step === 'processing') && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-lg border border-white/10 bg-white/5 p-8 backdrop-blur-2xl text-center"
        >
          <Loader2 className="h-12 w-12 animate-spin text-emerald-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">
            {step === 'uploading' ? 'Uploading Image...' : 'Extracting Measurements...'}
          </h3>
          <p className="text-sm text-white/60">
            {step === 'uploading' ? 'Please wait while we upload your image' : 'AI is analyzing your report'}
          </p>
        </motion.div>
      )}

      {/* Review State */}
      {step === 'review' && extractedData.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          {/* Measurement Date */}
          <div className="relative overflow-hidden rounded-lg border border-white/10 bg-white/5 p-4 backdrop-blur-2xl">
            <label className="block text-xs font-light text-white/70 mb-2">Measurement Date</label>
            <input
              type="date"
              value={measurementDate}
              onChange={(e) => setMeasurementDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="w-full rounded-lg bg-white/10 backdrop-blur-xl px-3 py-2 text-sm text-white focus:bg-white/15 focus:outline-none focus:ring-1 focus:ring-emerald-400/40"
            />
            <p className="text-xs text-white/50 mt-1">When were these measurements taken?</p>
          </div>

          {/* Warnings */}
          {warnings.length > 0 && (
            <div className="relative overflow-hidden rounded-lg border border-amber-500/20 bg-amber-500/10 p-4 backdrop-blur-2xl">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4 text-amber-400" />
                <h4 className="text-sm font-semibold text-amber-300">Processing Notes</h4>
              </div>
              <div className="space-y-1">
                {warnings.map((warning, index) => (
                  <p key={index} className="text-xs text-amber-200">{warning}</p>
                ))}
              </div>
            </div>
          )}

          {/* Potential Duplicates */}
          {duplicates.length > 0 && (
            <div className="relative overflow-hidden rounded-lg border border-orange-500/20 bg-orange-500/10 p-4 backdrop-blur-2xl">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="h-4 w-4 text-orange-400" />
                <h4 className="text-sm font-semibold text-orange-300">Potential Duplicates Found</h4>
              </div>
              <p className="text-xs text-orange-200 mb-3">
                The following extracted measurements may already exist in your data. Review and decide whether to save them.
              </p>
              <div className="space-y-3">
                {duplicates.map((dup, index) => (
                  <div key={index} className="rounded-lg bg-orange-500/5 p-3 border border-orange-500/20">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        dup.confidence === 'high' ? 'bg-destructive/20 text-destructive' :
                        dup.confidence === 'medium' ? 'bg-orange-500/20 text-orange-300' :
                        'bg-yellow-500/20 text-yellow-300'
                      }`}>
                        {dup.confidence.toUpperCase()} CONFIDENCE
                      </span>
                      <span className="text-xs text-orange-200">
                        {Math.round(dup.similarity * 100)}% similar
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <p className="text-orange-300 font-medium mb-1">Extracted:</p>
                        <p className="text-white">{dup.extracted.metric.replace(/_/g, ' ')}</p>
                        <p className="text-white/60">{dup.extracted.value} {dup.extracted.unit}</p>
                      </div>
                      <div>
                        <p className="text-orange-300 font-medium mb-1">Existing:</p>
                        <p className="text-white">{dup.existing.display_name}</p>
                        <p className="text-white/60">{dup.existing.latest_value} {dup.existing.unit}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Image Display */}
          <div className="relative overflow-hidden rounded-lg border border-white/10 bg-white/5 p-4 backdrop-blur-2xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white">Original Image</h3>
              <button
                onClick={() => setShowFullscreen(!showFullscreen)}
                className="text-xs text-white/60 hover:text-white/90 transition-colors"
              >
                {showFullscreen ? 'Minimize' : 'Expand'}
              </button>
            </div>
            <div className={`relative ${showFullscreen ? 'max-h-96' : 'max-h-48'} overflow-hidden rounded-lg bg-black/20`}>
              <img
                src={previewUrl!}
                alt="Uploaded report"
                className="w-full h-auto object-contain"
              />
              {!showFullscreen && (
                <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-black/40 to-transparent" />
              )}
            </div>
            <p className="text-xs text-white/50 mt-2">
              Use this image to verify all measurements were extracted correctly
            </p>
          </div>

          {/* Extracted Data */}
          <div className="relative overflow-hidden rounded-lg border border-white/10 bg-white/5 p-4 backdrop-blur-2xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white">
                Review Measurements ({extractedData.length} extracted)
              </h3>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                disabled={metricsLoading}
                className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Manual
              </button>
            </div>

            {/* Add Measurement Form */}
            {showAddForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20 p-3"
              >
                <h4 className="text-xs font-semibold text-emerald-300 mb-3">Add Missing Measurement</h4>

                {addErrors.length > 0 && (
                  <div className="mb-3 space-y-1">
                    {addErrors.map((error, i) => (
                      <p key={i} className="text-xs text-destructive">{error}</p>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs text-white/70 mb-1">Metric</label>
                    <select
                      value={newMetric}
                      onChange={(e) => setNewMetric(e.target.value)}
                      disabled={metricsLoading}
                      className="w-full rounded-lg bg-white/10 px-3 py-2 text-sm text-white focus:bg-white/15 focus:outline-none focus:ring-1 focus:ring-emerald-400/40 disabled:opacity-50"
                    >
                      <option value="">
                        {metricsLoading ? 'Loading metrics...' : 'Select a metric'}
                      </option>
                      {availableMetrics.map(metric => (
                        <option key={metric.key} value={metric.key}>
                          {metric.display_name} ({metric.unit})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-white/70 mb-1">Value</label>
                    <input
                      type="number"
                      step="0.1"
                      value={newValue}
                      onChange={(e) => setNewValue(e.target.value)}
                      placeholder="123.4"
                      className="w-full rounded-lg bg-white/10 px-3 py-2 text-sm text-white focus:bg-white/15 focus:outline-none focus:ring-1 focus:ring-emerald-400/40"
                    />
                  </div>
                </div>

                <div className="flex gap-2 mt-3">
                  <button
                    onClick={handleAddMeasurement}
                    className="flex-1 rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-500/30 transition-colors"
                  >
                    Add Measurement
                  </button>
                  <button
                    onClick={() => {
                      setShowAddForm(false)
                      setAddErrors([])
                      setNewMetric('')
                      setNewValue('')
                    }}
                    className="px-3 py-1.5 text-xs font-medium text-white/60 hover:text-white/90 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            )}

            <div className="space-y-2">
              {extractedData.map((measurement, index) => (
                <div key={index} className="flex items-center gap-3 rounded-lg bg-white/5 p-3 group hover:bg-white/10 transition-colors">
                  <div className="flex-1">
                    <div className="text-xs text-white/50 capitalize">
                      {measurement.metric.replace(/_/g, ' ')}
                      {measurement.normalized_from && (
                        <span className="text-emerald-400 ml-1">
                          (from: {measurement.normalized_from})
                        </span>
                      )}
                      {!measurement.confidence && (
                        <span className="text-blue-400 ml-1">(manual)</span>
                      )}
                    </div>
                  </div>
                  <input
                    type="number"
                    step="0.1"
                    value={measurement.value}
                    onChange={(e) => handleValueChange(index, parseFloat(e.target.value))}
                    className="w-24 rounded-lg bg-white/10 px-3 py-1.5 text-sm text-white focus:bg-white/15 focus:outline-none focus:ring-1 focus:ring-emerald-400/40"
                  />
                  <span className="text-sm text-white/60 w-12">{measurement.unit}</span>
                  {measurement.confidence && (
                    <span className="text-xs text-white/40">
                      {Math.round(measurement.confidence * 100)}%
                    </span>
                  )}
                  <button
                    onClick={() => handleRemoveMeasurement(index)}
                    className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive/80 transition-all ml-2 p-1 rounded hover:bg-destructive/10"
                    title="Remove measurement"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => {
                setStep('select')
                setSelectedFile(null)
                setPreviewUrl(null)
                setExtractedData([])
                setDuplicates([])
                setWarnings([])
              }}
              className="flex-1 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white/90 hover:bg-white/15 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex-1 rounded-lg bg-emerald-500/20 px-4 py-2 text-sm font-medium text-emerald-300 hover:bg-emerald-500/30 transition-colors"
            >
              Save Measurements
            </button>
          </div>
        </motion.div>
      )}

      {/* Saving State */}
      {step === 'saving' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-lg border border-white/10 bg-white/5 p-8 backdrop-blur-2xl text-center"
        >
          <Loader2 className="h-12 w-12 animate-spin text-emerald-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">Saving...</h3>
          <p className="text-sm text-white/60">Storing your measurements</p>
        </motion.div>
      )}

      {/* Success State */}
      {step === 'success' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative overflow-hidden rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-8 backdrop-blur-2xl text-center"
        >
          <CheckCircle className="h-12 w-12 text-emerald-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">Success!</h3>
          <p className="text-sm text-white/60">Measurements saved. Redirecting...</p>
        </motion.div>
      )}
    </section>
  )
}
