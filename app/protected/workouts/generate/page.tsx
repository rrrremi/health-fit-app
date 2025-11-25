'use client'

import { useState, useEffect, useRef, Suspense, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import SignOutButton from '@/components/auth/SignOutButton';
import { WorkoutGenerationResponse, WorkoutGenerationRequest } from '@/types/workout';
import { createClient } from '@/lib/supabase/client';
import { muscleGroups, mapToSimplifiedCategories } from '@/lib/data/muscleGroups';
import { motion } from 'framer-motion'
import { Dumbbell, Sparkles, Play, Settings, ChevronLeft, Zap, Target, Clock, BarChart3, CheckCircle, Activity, RefreshCw } from 'lucide-react'
import SimilarWorkoutSuggestions from '@/components/workout/SimilarWorkoutSuggestions';
import { toast } from '@/lib/toast';

// Dynamically import the ProgressiveWorkoutGeneration component
const ProgressiveWorkoutGeneration = dynamic(
  () => import('@/components/ui/ProgressiveWorkoutGeneration'),
  {
    ssr: false,
    loading: () => (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white/5 backdrop-blur-xl rounded-lg border border-transparent p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full border-2 border-white/20 border-t-white/90 animate-spin"></div>
            <h3 className="text-lg font-light text-white/90 mb-2">Loading...</h3>
          </div>
        </div>
      </div>
    )
  }
);

// Muscle groups and workout focus options
const MUSCLE_GROUPS = [
  { id: 'chest', label: 'Chest' },
  { id: 'back', label: 'Back' },
  { id: 'shoulders', label: 'Shoulders' },
  { id: 'biceps', label: 'Biceps' },
  { id: 'triceps', label: 'Triceps' },
  { id: 'forearms', label: 'Forearms' },
  { id: 'neck', label: 'Neck' },
  { id: 'core', label: 'Core' },
  { id: 'glutes', label: 'Glutes' },
  { id: 'quads', label: 'Quads' },
  { id: 'hamstrings', label: 'Hamstrings' },
  { id: 'calves', label: 'Calves' },
];

const WORKOUT_FOCUS = [
  { id: 'hypertrophy', label: 'Hypertrophy', icon: Dumbbell, description: 'Build muscle size and strength' },
  { id: 'strength', label: 'Strength', icon: Zap, description: 'Maximize muscle power and force' },
  { id: 'cardio', label: 'Cardio', icon: Activity, description: 'Cardiovascular endurance' },
  { id: 'isolation', label: 'Isolation', icon: Target, description: 'Target specific muscle groups' },
  { id: 'stability', label: 'Stability', icon: Target, description: 'Balance and control focus' },
  { id: 'plyometric', label: 'Plyometric', icon: Zap, description: 'Explosive movements' },
  { id: 'isometric', label: 'Isometric', icon: Target, description: 'Static holds that build strength without movement' },
  { id: 'mobility', label: 'Mobility', icon: Activity, description: 'Improve range of motion and joint flexibility' },
];

export default function GenerateWorkoutPage() {
  const router = useRouter()
  const supabase = createClient()
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [generationsToday, setGenerationsToday] = useState<number | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const generationCountCacheRef = useRef<{ count: number; timestamp: number } | null>(null)
  const CACHE_DURATION = 2 * 60 * 1000 // 2 minutes
  const [muscleFocus, setMuscleFocus] = useState<string[]>([]);
  const [workoutFocus, setWorkoutFocus] = useState<string[]>(['hypertrophy']);
  const [exerciseCount, setExerciseCount] = useState<number>(4);
  const [specialInstructions, setSpecialInstructions] = useState<string>('');
  const [charCount, setCharCount] = useState<number>(0);
  const [showProgressiveLoading, setShowProgressiveLoading] = useState(false)
  const [progressiveStep, setProgressiveStep] = useState(0)
  const [progressiveSteps] = useState([
    'Validating your inputs',
    'Preparing AI prompt',
    'Generating with OpenAI',
    'Processing workout data',
    'Saving to database',
    'Finalizing your workout'
  ])
  const [showSuggestions, setShowSuggestions] = useState(false)

  // Load URL parameters for regeneration
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search)
    const regenerate = searchParams.get('regenerate')
    
    if (regenerate === 'true') {
      try {
        const muscleFocusParam = searchParams.get('muscleFocus')
        const workoutFocusParam = searchParams.get('workoutFocus')
        const exerciseCountParam = searchParams.get('exerciseCount')
        const excludeExercisesParam = searchParams.get('excludeExercises')
        
        if (muscleFocusParam) setMuscleFocus(JSON.parse(muscleFocusParam))
        if (workoutFocusParam) setWorkoutFocus(JSON.parse(workoutFocusParam))
        if (exerciseCountParam) setExerciseCount(parseInt(exerciseCountParam))
        if (excludeExercisesParam) {
          const excludedExercises = JSON.parse(excludeExercisesParam)
          setSpecialInstructions(`Generate alternative exercises (not: ${excludedExercises.join(', ')})`)
        }
      } catch (err) {
        console.error('Error parsing regenerate params:', err)
      }
    }
  }, [])

  // Check admin status and generation count on load (with caching)
  useEffect(() => {
    async function loadInitialData() {
      try {
        // Get user
        const { data: { user } } = await supabase.auth.getUser()

        if (user) {
          // Check admin status
          const { data: profileData } = await supabase
            .from('profiles')
            .select('is_admin')
            .eq('id', user.id)
            .single()

          setIsAdmin(!!profileData?.is_admin)

          // Check cache first for generation count
          const cached = generationCountCacheRef.current
          const now = Date.now()
          
          if (cached && (now - cached.timestamp) < CACHE_DURATION) {
            // Use cached count (instant)
            setGenerationsToday(cached.count)
          } else {
            // Fetch fresh count
            const dayStart = new Date()
            dayStart.setHours(dayStart.getHours() - 24)

            const { count } = await supabase
              .from('workouts')
              .select('id', { count: 'exact', head: true })
              .eq('user_id', user.id)
              .gte('created_at', dayStart.toISOString())

            const generationCount = count || 0
            setGenerationsToday(generationCount)
            
            // Cache the count
            generationCountCacheRef.current = {
              count: generationCount,
              timestamp: now
            }
          }
        }
      } catch (error) {
        console.error('Error loading initial data:', error)
      } finally {
        setIsLoaded(true)
      }
    }

    loadInitialData()
  }, [supabase, CACHE_DURATION])

  // Memoize validation result
  const validationError = useMemo(() => {
    if (muscleFocus.length < 1 || muscleFocus.length > 4) {
      return 'Please select 1-4 muscle groups';
    }

    if (workoutFocus.length < 1 || workoutFocus.length > 3) {
      return 'Please select 1-3 workout focus types';
    }

    if (exerciseCount < 1 || exerciseCount > 10) {
      return 'Exercise count must be between 1-10';
    }

    if (specialInstructions && specialInstructions.length > 140) {
      return 'Special instructions must be 140 characters or less';
    }

    return null;
  }, [muscleFocus.length, workoutFocus.length, exerciseCount, specialInstructions]);

  // Handle click on muscle group button (for regular selection)
  const toggleMuscleGroup = useCallback((id: string) => {
    // Update muscle focus state
    setMuscleFocus(prev => {
      const newFocus = prev.includes(id) 
        ? prev.filter(m => m !== id) 
        : prev.length < 4 ? [...prev, id] : prev;
      
      // Hide suggestions if all muscles are unselected
      if (newFocus.length === 0) {
        setShowSuggestions(false);
      } else if (!showSuggestions && newFocus.length > 0 && workoutFocus.length > 0) {
        // Show suggestions if we have at least one muscle and one focus
        setShowSuggestions(true);
      }
      
      return newFocus;
    });

    // Clear any existing error when user interacts with the form
    if (error) setError(null);
  }, [error, showSuggestions, workoutFocus.length]);
  
  // Handle workout focus selection (multiple, up to 3)
  const toggleWorkoutFocus = useCallback((id: string) => {
    // Update workout focus state
    setWorkoutFocus(prev => {
      // Always keep at least one focus selected
      const newFocus = prev.includes(id)
        ? prev.length > 1 ? prev.filter(f => f !== id) : prev
        : prev.length < 3 ? [...prev, id] : prev;
      
      // Hide suggestions if all focus options are unselected (shouldn't happen due to min 1 requirement)
      // or show suggestions if we have at least one muscle and one focus
      if (newFocus.length === 0) {
        setShowSuggestions(false);
      } else if (!showSuggestions && muscleFocus.length > 0 && newFocus.length > 0) {
        setShowSuggestions(true);
      }
      
      return newFocus;
    });

    // Clear any existing error when user interacts with the form
    if (error) setError(null);
  }, [error, muscleFocus.length, showSuggestions]);

  const generateWorkout = async () => {
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsGenerating(true);
    setError(null);
    setShowProgressiveLoading(true);
    setProgressiveStep(0);

    try {
      // Step 1: Validating inputs
      setProgressiveStep(0);

      // Step 2: Preparing AI prompt
      setProgressiveStep(1);

      // Check if this is a regeneration (excludeExercises in URL)
      const searchParams = new URLSearchParams(window.location.search)
      const excludeExercisesParam = searchParams.get('excludeExercises')
      const excludeExercises = excludeExercisesParam ? JSON.parse(excludeExercisesParam) : undefined
      
      const requestBody: WorkoutGenerationRequest & { excludeExercises?: string[] } = {
        muscleFocus: muscleFocus,
        workoutFocus: workoutFocus, // Pass the entire array of workout focus types
        exerciseCount: exerciseCount,
        specialInstructions: specialInstructions,
        difficulty: 'intermediate', // Default difficulty
        excludeExercises: excludeExercises
      };

      // Step 3: Generating with OpenAI
      setProgressiveStep(2);

      let data;
      try {
        const response = await fetch('/api/workouts/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody)
        });

        // Check if the response is JSON before trying to parse it
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          data = await response.json();
        } else {
          // If not JSON, get the text and log it for debugging
          const text = await response.text();
          console.error('Non-JSON response received:', text.substring(0, 500));
          data = { error: 'Invalid server response', rawResponse: text.substring(0, 500) };
        }

        if (!response.ok) {
          console.error('Workout generation failed:', {
            status: response.status,
            statusText: response.statusText,
            error: data.error,
            details: data.details,
            requestBody
          });
          throw new Error(data.error || 'Failed to generate workout');
        }
      } catch (fetchError) {
        console.error('Fetch error during workout generation:', fetchError);
        throw fetchError;
      }

      // Step 4: Processing workout data
      setProgressiveStep(3);
      await new Promise(resolve => setTimeout(resolve, 500));

      // Step 5: Saving to database
      setProgressiveStep(4);
      await new Promise(resolve => setTimeout(resolve, 300));

      // Step 6: Finalizing workout
      setProgressiveStep(5);
      await new Promise(resolve => setTimeout(resolve, 500));

      if (data && data.success && data.workoutId) {
        // Update the generation count
        setGenerationsToday(prev => prev !== null ? prev + 1 : 1);

        // Hide progressive loading
        setShowProgressiveLoading(false);

        toast.success('Workout generated successfully!');
        
        // Redirect to the workout details page without leaving the generator in history
        router.replace(`/protected/workouts/${data.workoutId}`);
      } else if (data) {
        throw new Error(data.error || 'Failed to generate workout');
      } else {
        throw new Error('No response data received');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(message);
      toast.error(message);
      setIsGenerating(false);
      setShowProgressiveLoading(false);
    }
  };

  // Show loading indicator while initial data is being fetched
  if (!isLoaded) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-fuchsia-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  // Progressive loading overlay
  const loadingOverlay = showProgressiveLoading && (
    <Suspense fallback={
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="w-16 h-16 mx-auto rounded-full border-4 border-fuchsia-400/30 border-t-fuchsia-400 animate-spin"></div>
      </div>
    }>
      <ProgressiveWorkoutGeneration
        isVisible={showProgressiveLoading}
        currentStep={progressiveStep}
        steps={progressiveSteps}
      />
    </Suspense>
  );

  return (
    <>
      {/* Main Content - Minimalistic Form */}
      <section className="mx-auto w-full max-w-3xl px-2 pb-10">
        {/* Back button positioned like in Profile view */}
        <div className="mb-2">
          <Link href="/protected/workouts">
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
          <div className="absolute -bottom-12 -left-12 h-32 w-32 rounded-full bg-white/10 blur-2xl opacity-50" />
          
          <div className="relative">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-5 w-5 text-white/90" />
              <h1 className="text-xl font-semibold tracking-tight">Generate Workout</h1>
            </div>
            <p className="text-xs text-white/70">AI-powered workout tailored to your goals</p>
          </div>
        </motion.div>

        {/* Minimalistic Form Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="rounded-lg border border-transparent bg-white/5 backdrop-blur-xl overflow-hidden"
        >
          {/* Form Content */}
          <div className="p-3">
            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/20 text-red-200 text-sm">
                {error}
              </div>
            )}

            {/* Muscle Groups - Horizontal Chips */}
            <div className="mb-3">
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs text-white/70">Target Muscles</label>
                <span className="text-xs text-white/50 tabular-nums">
                  {muscleFocus.length}/4
                </span>
              </div>
              <div className="flex flex-row flex-wrap gap-1.5 justify-center">
                {MUSCLE_GROUPS.map((group) => (
                  <button
                    key={group.id}
                    onClick={() => toggleMuscleGroup(group.id)}
                    className={`h-7 px-2 rounded-full text-[10px] font-medium transition-colors ${
                      muscleFocus.includes(group.id)
                        ? 'bg-fuchsia-500/30 text-fuchsia-200 border border-transparent'
                        : 'bg-white/10 text-white/70 border border-transparent hover:bg-white/20'
                    }`}
                  >
                    {group.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Workout Focus - Multiple Selection (up to 3) */}
            <div className="mb-3">
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs text-white/70">Workout Focus</label>
                <span className="text-xs text-white/50 tabular-nums">
                  {workoutFocus.length}/3
                </span>
              </div>
              <div className="flex flex-row flex-wrap gap-1.5 justify-center">
                {WORKOUT_FOCUS.map((focus) => (
                  <button
                    key={focus.id}
                    onClick={() => toggleWorkoutFocus(focus.id)}
                    className={`flex flex-row items-center h-7 px-2 rounded-full transition-colors ${
                      workoutFocus.includes(focus.id)
                        ? 'bg-cyan-500/30 text-cyan-200 border border-transparent'
                        : 'bg-white/10 text-white/70 border border-transparent hover:bg-white/20'
                    }`}
                    aria-pressed={workoutFocus.includes(focus.id)}
                  >
                    <focus.icon className={`h-3 w-3 mr-1 ${workoutFocus.includes(focus.id) ? 'text-cyan-300' : 'text-white/60'}`} />
                    <span className="text-[10px] font-medium">{focus.label}</span>
                  </button>
                ))}
              </div>
              
              {/* Remove Selected Focus Summary */}
            </div>

            {/* Exercise Count - Minimalist Slider */}
            <div className="mb-3">
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs text-white/50">Exercises</label>
                <span className="text-sm text-white/90 tabular-nums">{exerciseCount}</span>
              </div>
              <div className="relative">
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={exerciseCount}
                  onChange={(e) => setExerciseCount(parseInt(e.target.value))}
                  className="w-full h-[2px] bg-white/10 rounded-full appearance-none cursor-pointer 
                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 
                    [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white/90 [&::-webkit-slider-thumb]:transition-all
                    [&::-webkit-slider-thumb]:hover:bg-white [&::-webkit-slider-thumb]:hover:scale-110
                    [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:border-none
                    [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white/90 [&::-moz-range-thumb]:transition-all
                    [&::-moz-range-thumb]:hover:bg-white [&::-moz-range-thumb]:hover:scale-110
                    focus:outline-none"
                />
                <div className="flex justify-between mt-1.5 text-[10px] text-white/30">
                  <span>1</span>
                  <span>10</span>
                </div>
              </div>
            </div>

            {/* Special Instructions - Enhanced Input */}
            <div className="mb-3">
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs text-white/70">Special Instructions</label>
                {charCount > 0 && (
                  <span className={`text-[10px] ${charCount > 120 ? 'text-amber-400' : 'text-white/50'}`}>
                    {charCount}/140
                  </span>
                )}
              </div>
              <textarea
                value={specialInstructions}
                onChange={(e) => {
                  setSpecialInstructions(e.target.value);
                  setCharCount(e.target.value.length);
                }}
                placeholder="Optional: Any special requirements or limitations..."
                className="w-full p-2 rounded-md border border-transparent bg-white/5 text-white placeholder-white/40 
                  focus:border-fuchsia-400/50 focus:outline-none text-xs min-h-[60px] resize-none"
                maxLength={140}
              />
            </div>
            {/* Generate Button */}
            <button
              disabled={isGenerating || muscleFocus.length === 0}
              onClick={generateWorkout}
              className={`w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg border font-light text-xs transition-all ${
                isGenerating || muscleFocus.length === 0
                  ? 'border-white/20 bg-white/10 text-white/50 cursor-not-allowed'
                  : 'border-white/30 bg-white/20 text-white/90 hover:bg-white/30 backdrop-blur-xl'
              }`}
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
                  Generating...
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5" strokeWidth={1.5} />
                  Generate
                </>
              )}
            </button>
          </div>

          {/* Usage Stats */}
          <div className="mt-2 text-center text-[10px] text-white/50">
            Today: {generationsToday !== null ? `${generationsToday}/100` : '...'}
          </div>
        </motion.div>
        
        {/* Similar Workout Suggestions */}
        <SimilarWorkoutSuggestions 
          muscleFocus={muscleFocus}
          workoutFocus={workoutFocus}
          isVisible={showSuggestions && !isGenerating && muscleFocus.length > 0 && workoutFocus.length > 0}
        />
      </section>

      {/* Progressive Loading Overlay */}
      {loadingOverlay}
    </>
  );
}
