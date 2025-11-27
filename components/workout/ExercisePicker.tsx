'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Search, Plus, Loader2 } from 'lucide-react'
import { MUSCLE_TAXONOMY } from '@/lib/muscles/taxonomy'

interface Exercise {
  id: string
  name: string
  primary_muscle: string
  secondary_muscles: string[]
  equipment: string
  difficulty: string
}

interface ExercisePickerProps {
  isOpen: boolean
  workoutId: string
  onClose: () => void
  onExerciseAdded: (exercise?: Exercise) => void
  createMode?: boolean
  onSelectExercise?: (exerciseName: string) => void
}

// Use centralized taxonomy for muscle groups
const MUSCLE_GROUPS = ['all', ...MUSCLE_TAXONOMY.map(g => g.id)]

const MOVEMENT_TYPES = [
  'all',
  'press',
  'pull',
  'row',
  'push',
  'extension',
  'cable',
  'barbell',
  'curl',
  'bodyweight',
  'lift',
  'hold'
]

export default function ExercisePicker({
  isOpen,
  workoutId,
  onClose,
  onExerciseAdded,
  createMode = false,
  onSelectExercise
}: ExercisePickerProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMuscle, setSelectedMuscle] = useState('all')
  const [selectedMovement, setSelectedMovement] = useState('all')
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [offset, setOffset] = useState(0)
  const [addingExerciseId, setAddingExerciseId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  
  // Performance: Cache exercise lists to avoid refetching
  const exerciseCacheRef = useRef<Map<string, { exercises: Exercise[]; timestamp: number }>>(new Map())
  const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

  // Auto-focus search input when panel opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100)
    }
  }, [isOpen])

  // Search exercises with debounce (reset on filter change)
  useEffect(() => {
    if (!isOpen) return // Don't search if picker is closed
    
    const timer = setTimeout(() => {
      setOffset(0)
      setHasMore(true)
      searchExercises(true)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery, selectedMuscle, selectedMovement, isOpen])

  // Load exercises on mount (with caching)
  useEffect(() => {
    if (isOpen) {
      setOffset(0)
      setHasMore(true)
      
      // Check cache first
      const cacheKey = `${searchQuery}-${selectedMuscle}-${selectedMovement}`
      const cached = exerciseCacheRef.current.get(cacheKey)
      const now = Date.now()
      
      if (cached && (now - cached.timestamp) < CACHE_DURATION) {
        // Use cached data immediately (0ms load time)
        setExercises(cached.exercises)
        setIsSearching(false)
        setHasMore(cached.exercises.length === 20)
      } else {
        // Fetch fresh data
        searchExercises(true)
      }
    }
  }, [isOpen])

  // Infinite scroll handler
  useEffect(() => {
    const listElement = listRef.current
    if (!listElement) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = listElement
      // Load more when scrolled to 80% of the list
      if (scrollTop + clientHeight >= scrollHeight * 0.8 && hasMore && !isLoadingMore && !isSearching) {
        loadMoreExercises()
      }
    }

    listElement.addEventListener('scroll', handleScroll)
    return () => listElement.removeEventListener('scroll', handleScroll)
  }, [hasMore, isLoadingMore, isSearching, offset])

  const searchExercises = async (reset = false) => {
    setIsSearching(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        query: searchQuery,
        muscle: selectedMuscle,
        movement: selectedMovement,
        limit: '20',
        offset: reset ? '0' : offset.toString()
      })

      const response = await fetch(`/api/exercises/search?${params}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to search exercises')
      }

      const newExercises = data.exercises || []
      
      if (reset) {
        setExercises(newExercises)
        setOffset(20)
        
        // Cache the results
        const cacheKey = `${searchQuery}-${selectedMuscle}-${selectedMovement}`
        exerciseCacheRef.current.set(cacheKey, {
          exercises: newExercises,
          timestamp: Date.now()
        })
      } else {
        setExercises(prev => [...prev, ...newExercises])
        setOffset(prev => prev + 20)
      }
      
      // If we got less than 20, there's no more
      setHasMore(newExercises.length === 20)
    } catch (err: any) {
      console.error('Error searching exercises:', err)
      setError(err.message)
    } finally {
      setIsSearching(false)
    }
  }

  const loadMoreExercises = async () => {
    if (isLoadingMore || !hasMore) return
    
    setIsLoadingMore(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        query: searchQuery,
        muscle: selectedMuscle,
        movement: selectedMovement,
        limit: '20',
        offset: offset.toString()
      })

      const response = await fetch(`/api/exercises/search?${params}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load more exercises')
      }

      const newExercises = data.exercises || []
      setExercises(prev => [...prev, ...newExercises])
      setOffset(prev => prev + 20)
      setHasMore(newExercises.length === 20)
    } catch (err: any) {
      console.error('Error loading more exercises:', err)
      setError(err.message)
    } finally {
      setIsLoadingMore(false)
    }
  }

  const handleAddExercise = async (exerciseId: string) => {
    if (addingExerciseId !== null) return // Prevent duplicate adds
    
    setAddingExerciseId(exerciseId)
    setError(null)

    // Create mode: just return the exercise name
    if (createMode && onSelectExercise) {
      const exercise = exercises.find(ex => ex.id === exerciseId)
      if (exercise) {
        onSelectExercise(exercise.name)
      }
      setAddingExerciseId(null)
      return
    }

    const exercise = exercises.find(ex => ex.id === exerciseId)
    if (!exercise) {
      setAddingExerciseId(null)
      return
    }

    // Optimistic update: Remove from list immediately
    setExercises(prev => prev.filter(ex => ex.id !== exerciseId))
    
    // Notify parent with exercise data for optimistic update
    onExerciseAdded(exercise)

    // Save in background
    try {
      const response = await fetch('/api/workouts/exercises/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workoutId,
          exerciseId
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add exercise')
      }

      // Success - already updated UI optimistically
    } catch (err: any) {
      console.error('Error adding exercise:', err)
      setError(err.message)
      
      // Rollback: Add exercise back to list
      setExercises(prev => [...prev, exercise].sort((a, b) => a.name.localeCompare(b.name)))
    } finally {
      setAddingExerciseId(null)
    }
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
            className="fixed right-0 top-0 bottom-0 w-[380px] bg-white/5 backdrop-blur-xl border-l border-white/10 shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-transparent">
              <h2 className="text-sm font-light text-white/90 tracking-wide">Add Exercise</h2>
              <button
                onClick={onClose}
                className="p-1 rounded-md hover:bg-white/10 transition-colors"
              >
                <X className="h-4 w-4 text-white/60" strokeWidth={1.5} />
              </button>
            </div>

            {/* Search Bar */}
            <div className="p-3 border-b border-transparent">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" strokeWidth={1.5} />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search exercises..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-md border border-white/20 bg-white/10 text-white/90 placeholder-white/30 font-light text-xs focus:border-white/30 focus:outline-none backdrop-blur-xl transition-colors"
                />
              </div>
            </div>

            {/* Muscle Filter */}
            <div className="px-3 py-2 border-b border-transparent">
              <div className="text-[9px] text-white/40 uppercase tracking-wider mb-1.5 font-light">Muscle Group</div>
              <div className="flex gap-1.5 overflow-x-auto scrollbar-thin pb-1">
                {MUSCLE_GROUPS.map((muscle) => (
                  <button
                    key={muscle}
                    onClick={() => setSelectedMuscle(muscle)}
                    className={`
                      px-2.5 py-1 rounded-full text-[10px] font-light whitespace-nowrap transition-all border
                      ${selectedMuscle === muscle
                        ? 'border-white/30 bg-white/20 text-white/90'
                        : 'border-white/15 bg-white/5 text-white/60 hover:bg-white/10 hover:border-white/20'
                      }
                    `}
                  >
                    {muscle.charAt(0).toUpperCase() + muscle.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Movement Type Filter */}
            <div className="px-3 py-2 border-b border-transparent">
              <div className="text-[9px] text-white/40 uppercase tracking-wider mb-1.5 font-light">Movement Type</div>
              <div className="flex gap-1.5 overflow-x-auto scrollbar-thin pb-1">
                {MOVEMENT_TYPES.map((movement) => (
                  <button
                    key={movement}
                    onClick={() => setSelectedMovement(movement)}
                    className={`
                      px-2.5 py-1 rounded-full text-[10px] font-light whitespace-nowrap transition-all border
                      ${selectedMovement === movement
                        ? 'border-white/30 bg-white/20 text-white/90'
                        : 'border-white/15 bg-white/5 text-white/60 hover:bg-white/10 hover:border-white/20'
                      }
                    `}
                  >
                    {movement.charAt(0).toUpperCase() + movement.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mx-3 mt-2 p-2 rounded-md bg-red-500/10 border border-red-500/20 text-red-200 text-xs font-light">
                {error}
              </div>
            )}

            {/* Exercise List */}
            <div ref={listRef} className="flex-1 overflow-y-auto p-3 space-y-1.5 scrollbar-thin">
              {isSearching && exercises.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-5 w-5 animate-spin text-white/30" strokeWidth={1.5} />
                </div>
              ) : exercises.length === 0 ? (
                <div className="text-center py-12 text-white/40 text-xs font-light">
                  No exercises found
                </div>
              ) : (
                <>
                  {exercises.map((exercise) => (
                    <div
                      key={exercise.id}
                      className="group p-2 rounded-md border border-transparent bg-white/5 hover:bg-white/10 transition-all backdrop-blur-xl"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-light text-white/90 truncate">
                            {exercise.name}
                          </h4>
                        </div>
                        <button
                          onClick={() => handleAddExercise(exercise.id)}
                          disabled={addingExerciseId === exercise.id}
                          className="flex-shrink-0 h-5 w-5 rounded-full border border-white/20 bg-white/5 hover:bg-white/15 hover:border-white/30 flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-xl group-hover:border-white/30"
                        >
                          {addingExerciseId === exercise.id ? (
                            <Loader2 className="h-2.5 w-2.5 animate-spin text-white/60" strokeWidth={1.5} />
                          ) : (
                            <Plus className="h-2.5 w-2.5 text-white/60 group-hover:text-white/80" strokeWidth={1.5} />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  {/* Loading More Indicator */}
                  {isLoadingMore && (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-4 w-4 animate-spin text-white/30" strokeWidth={1.5} />
                    </div>
                  )}
                  
                  {/* End of List */}
                  {!hasMore && exercises.length > 0 && (
                    <div className="text-center py-4 text-white/30 text-[10px] font-light">
                      No more exercises
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
