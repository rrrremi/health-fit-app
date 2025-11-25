'use client'

import { useMemo } from 'react'
import { Exercise } from '@/types/workout'

interface MuscleMapProps {
  exercises: Exercise[]
  className?: string
}

// Map exercise muscle names to our SVG path IDs
const MUSCLE_ALIASES: Record<string, string[]> = {
  chest: ['chest', 'pectorals', 'pecs'],
  back: ['back', 'lats', 'latissimus', 'rhomboids', 'upper back', 'lower back', 'erector'],
  shoulders: ['shoulders', 'deltoids', 'delts', 'front delts', 'rear delts', 'lateral delts'],
  biceps: ['biceps', 'bicep'],
  triceps: ['triceps', 'tricep'],
  forearms: ['forearms', 'forearm', 'wrists', 'grip'],
  core: ['core', 'abs', 'abdominals', 'obliques', 'rectus abdominis', 'transverse'],
  quads: ['quads', 'quadriceps', 'thighs', 'front thighs'],
  hamstrings: ['hamstrings', 'hamstring', 'rear thighs'],
  glutes: ['glutes', 'gluteus', 'buttocks', 'hips'],
  calves: ['calves', 'calf', 'gastrocnemius', 'soleus'],
  traps: ['traps', 'trapezius', 'upper traps', 'neck'],
}

// Normalize muscle name to our standard keys
function normalizeMuscle(muscle: string): string | null {
  const lower = muscle.toLowerCase().trim()
  for (const [key, aliases] of Object.entries(MUSCLE_ALIASES)) {
    if (aliases.some(alias => lower.includes(alias) || alias.includes(lower))) {
      return key
    }
  }
  // Check for full body
  if (lower.includes('full body') || lower.includes('compound') || lower.includes('total body')) {
    return 'full_body'
  }
  return null
}

// Calculate muscle intensity from exercises
function calculateMuscleIntensity(exercises: Exercise[]): Record<string, number> {
  const counts: Record<string, number> = {}
  
  exercises.forEach(exercise => {
    const muscles = exercise.primary_muscles || []
    muscles.forEach(muscle => {
      const normalized = normalizeMuscle(muscle)
      if (normalized === 'full_body') {
        // Full body hits everything
        Object.keys(MUSCLE_ALIASES).forEach(key => {
          counts[key] = (counts[key] || 0) + 0.5
        })
      } else if (normalized) {
        counts[normalized] = (counts[normalized] || 0) + 1
      }
    })
  })
  
  // Normalize to 0-1 scale
  const maxCount = Math.max(...Object.values(counts), 1)
  const intensity: Record<string, number> = {}
  for (const [key, count] of Object.entries(counts)) {
    intensity[key] = Math.min(count / maxCount, 1)
  }
  
  return intensity
}

// Get fill color based on intensity (white with varying opacity)
function getMuscleFill(intensity: number): string {
  if (intensity <= 0) return 'transparent'
  // Map intensity to opacity: 0.15 to 0.9
  const opacity = 0.15 + (intensity * 0.75)
  return `rgba(255, 255, 255, ${opacity.toFixed(2)})`
}

// SVG Filter for 3D glow effect
const SVGFilters = () => (
  <defs>
    <filter id="muscle-glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="2" result="blur" />
      <feOffset in="blur" dx="0" dy="1" result="offsetBlur" />
      <feFlood floodColor="white" floodOpacity="0.3" />
      <feComposite in2="offsetBlur" operator="in" />
      <feMerge>
        <feMergeNode />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
    <filter id="inner-glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
    <linearGradient id="body-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stopColor="white" stopOpacity="0.1" />
      <stop offset="100%" stopColor="white" stopOpacity="0.05" />
    </linearGradient>
  </defs>
)

// Front view SVG
const FrontView = ({ intensity }: { intensity: Record<string, number> }) => (
  <svg viewBox="0 0 100 200" className="w-full h-full">
    <SVGFilters />
    
    {/* Body outline */}
    <g stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" fill="none">
      {/* Head */}
      <ellipse cx="50" cy="18" rx="12" ry="14" />
      {/* Neck */}
      <path d="M44 30 L44 38 M56 30 L56 38" />
      {/* Torso outline */}
      <path d="M30 40 Q25 60 28 90 L32 120 L40 125 L50 128 L60 125 L68 120 L72 90 Q75 60 70 40 Z" />
      {/* Arms outline */}
      <path d="M28 42 Q15 50 12 75 Q10 90 15 105 Q18 115 22 120" />
      <path d="M72 42 Q85 50 88 75 Q90 90 85 105 Q82 115 78 120" />
      {/* Legs outline */}
      <path d="M35 125 L32 160 L30 190 M45 128 L42 160 L40 190" />
      <path d="M65 125 L68 160 L70 190 M55 128 L58 160 L60 190" />
    </g>
    
    {/* Muscle groups - Front */}
    <g filter="url(#inner-glow)">
      {/* Neck/Traps front */}
      <path 
        d="M44 32 Q50 35 56 32 L56 40 Q50 42 44 40 Z"
        fill={getMuscleFill(intensity.traps || 0)}
        stroke="rgba(255,255,255,0.2)"
        strokeWidth="0.3"
      />
      
      {/* Shoulders - Left */}
      <path 
        d="M30 42 Q28 48 29 55 L38 52 L40 44 Q35 40 30 42 Z"
        fill={getMuscleFill(intensity.shoulders || 0)}
        stroke="rgba(255,255,255,0.2)"
        strokeWidth="0.3"
      />
      
      {/* Shoulders - Right */}
      <path 
        d="M70 42 Q72 48 71 55 L62 52 L60 44 Q65 40 70 42 Z"
        fill={getMuscleFill(intensity.shoulders || 0)}
        stroke="rgba(255,255,255,0.2)"
        strokeWidth="0.3"
      />
      
      {/* Chest - Left */}
      <path 
        d="M38 48 Q42 45 50 46 L50 62 Q45 65 40 63 L38 55 Z"
        fill={getMuscleFill(intensity.chest || 0)}
        stroke="rgba(255,255,255,0.2)"
        strokeWidth="0.3"
      />
      
      {/* Chest - Right */}
      <path 
        d="M62 48 Q58 45 50 46 L50 62 Q55 65 60 63 L62 55 Z"
        fill={getMuscleFill(intensity.chest || 0)}
        stroke="rgba(255,255,255,0.2)"
        strokeWidth="0.3"
      />
      
      {/* Biceps - Left */}
      <path 
        d="M26 55 Q22 65 20 78 L28 80 Q30 68 32 58 Z"
        fill={getMuscleFill(intensity.biceps || 0)}
        stroke="rgba(255,255,255,0.2)"
        strokeWidth="0.3"
      />
      
      {/* Biceps - Right */}
      <path 
        d="M74 55 Q78 65 80 78 L72 80 Q70 68 68 58 Z"
        fill={getMuscleFill(intensity.biceps || 0)}
        stroke="rgba(255,255,255,0.2)"
        strokeWidth="0.3"
      />
      
      {/* Forearms - Left */}
      <path 
        d="M18 82 Q16 95 18 108 L24 110 Q26 96 24 84 Z"
        fill={getMuscleFill(intensity.forearms || 0)}
        stroke="rgba(255,255,255,0.2)"
        strokeWidth="0.3"
      />
      
      {/* Forearms - Right */}
      <path 
        d="M82 82 Q84 95 82 108 L76 110 Q74 96 76 84 Z"
        fill={getMuscleFill(intensity.forearms || 0)}
        stroke="rgba(255,255,255,0.2)"
        strokeWidth="0.3"
      />
      
      {/* Core/Abs */}
      <path 
        d="M42 65 L42 95 Q45 100 50 100 Q55 100 58 95 L58 65 Q55 62 50 62 Q45 62 42 65 Z"
        fill={getMuscleFill(intensity.core || 0)}
        stroke="rgba(255,255,255,0.2)"
        strokeWidth="0.3"
      />
      
      {/* Obliques - Left */}
      <path 
        d="M35 68 L42 65 L42 95 L38 100 Q34 90 35 68 Z"
        fill={getMuscleFill(intensity.core || 0) !== 'transparent' ? getMuscleFill((intensity.core || 0) * 0.7) : 'transparent'}
        stroke="rgba(255,255,255,0.15)"
        strokeWidth="0.3"
      />
      
      {/* Obliques - Right */}
      <path 
        d="M65 68 L58 65 L58 95 L62 100 Q66 90 65 68 Z"
        fill={getMuscleFill(intensity.core || 0) !== 'transparent' ? getMuscleFill((intensity.core || 0) * 0.7) : 'transparent'}
        stroke="rgba(255,255,255,0.15)"
        strokeWidth="0.3"
      />
      
      {/* Quads - Left */}
      <path 
        d="M36 105 L34 125 L32 155 L42 158 L45 130 L44 108 Q40 103 36 105 Z"
        fill={getMuscleFill(intensity.quads || 0)}
        stroke="rgba(255,255,255,0.2)"
        strokeWidth="0.3"
      />
      
      {/* Quads - Right */}
      <path 
        d="M64 105 L66 125 L68 155 L58 158 L55 130 L56 108 Q60 103 64 105 Z"
        fill={getMuscleFill(intensity.quads || 0)}
        stroke="rgba(255,255,255,0.2)"
        strokeWidth="0.3"
      />
      
      {/* Calves - Left front */}
      <path 
        d="M32 162 L30 185 L38 188 L42 165 Z"
        fill={getMuscleFill(intensity.calves || 0)}
        stroke="rgba(255,255,255,0.2)"
        strokeWidth="0.3"
      />
      
      {/* Calves - Right front */}
      <path 
        d="M68 162 L70 185 L62 188 L58 165 Z"
        fill={getMuscleFill(intensity.calves || 0)}
        stroke="rgba(255,255,255,0.2)"
        strokeWidth="0.3"
      />
    </g>
  </svg>
)

// Back view SVG
const BackView = ({ intensity }: { intensity: Record<string, number> }) => (
  <svg viewBox="0 0 100 200" className="w-full h-full">
    <SVGFilters />
    
    {/* Body outline */}
    <g stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" fill="none">
      {/* Head */}
      <ellipse cx="50" cy="18" rx="12" ry="14" />
      {/* Neck */}
      <path d="M44 30 L44 38 M56 30 L56 38" />
      {/* Torso outline */}
      <path d="M30 40 Q25 60 28 90 L32 120 L40 125 L50 128 L60 125 L68 120 L72 90 Q75 60 70 40 Z" />
      {/* Arms outline */}
      <path d="M28 42 Q15 50 12 75 Q10 90 15 105 Q18 115 22 120" />
      <path d="M72 42 Q85 50 88 75 Q90 90 85 105 Q82 115 78 120" />
      {/* Legs outline */}
      <path d="M35 125 L32 160 L30 190 M45 128 L42 160 L40 190" />
      <path d="M65 125 L68 160 L70 190 M55 128 L58 160 L60 190" />
    </g>
    
    {/* Muscle groups - Back */}
    <g filter="url(#inner-glow)">
      {/* Traps */}
      <path 
        d="M38 38 Q44 32 50 30 Q56 32 62 38 L62 50 Q56 48 50 48 Q44 48 38 50 Z"
        fill={getMuscleFill(intensity.traps || 0)}
        stroke="rgba(255,255,255,0.2)"
        strokeWidth="0.3"
      />
      
      {/* Rear Delts - Left */}
      <path 
        d="M30 42 Q28 48 29 55 L38 55 L38 44 Q35 40 30 42 Z"
        fill={getMuscleFill(intensity.shoulders || 0)}
        stroke="rgba(255,255,255,0.2)"
        strokeWidth="0.3"
      />
      
      {/* Rear Delts - Right */}
      <path 
        d="M70 42 Q72 48 71 55 L62 55 L62 44 Q65 40 70 42 Z"
        fill={getMuscleFill(intensity.shoulders || 0)}
        stroke="rgba(255,255,255,0.2)"
        strokeWidth="0.3"
      />
      
      {/* Upper Back / Lats - Left */}
      <path 
        d="M38 52 L38 80 Q42 85 50 85 L50 52 Q44 50 38 52 Z"
        fill={getMuscleFill(intensity.back || 0)}
        stroke="rgba(255,255,255,0.2)"
        strokeWidth="0.3"
      />
      
      {/* Upper Back / Lats - Right */}
      <path 
        d="M62 52 L62 80 Q58 85 50 85 L50 52 Q56 50 62 52 Z"
        fill={getMuscleFill(intensity.back || 0)}
        stroke="rgba(255,255,255,0.2)"
        strokeWidth="0.3"
      />
      
      {/* Lower Back */}
      <path 
        d="M40 88 Q45 85 50 85 Q55 85 60 88 L60 105 Q55 108 50 108 Q45 108 40 105 Z"
        fill={getMuscleFill(intensity.back || 0) !== 'transparent' ? getMuscleFill((intensity.back || 0) * 0.8) : 'transparent'}
        stroke="rgba(255,255,255,0.15)"
        strokeWidth="0.3"
      />
      
      {/* Triceps - Left */}
      <path 
        d="M26 55 Q22 65 20 78 L28 80 Q30 68 32 58 Z"
        fill={getMuscleFill(intensity.triceps || 0)}
        stroke="rgba(255,255,255,0.2)"
        strokeWidth="0.3"
      />
      
      {/* Triceps - Right */}
      <path 
        d="M74 55 Q78 65 80 78 L72 80 Q70 68 68 58 Z"
        fill={getMuscleFill(intensity.triceps || 0)}
        stroke="rgba(255,255,255,0.2)"
        strokeWidth="0.3"
      />
      
      {/* Forearms - Left */}
      <path 
        d="M18 82 Q16 95 18 108 L24 110 Q26 96 24 84 Z"
        fill={getMuscleFill(intensity.forearms || 0)}
        stroke="rgba(255,255,255,0.2)"
        strokeWidth="0.3"
      />
      
      {/* Forearms - Right */}
      <path 
        d="M82 82 Q84 95 82 108 L76 110 Q74 96 76 84 Z"
        fill={getMuscleFill(intensity.forearms || 0)}
        stroke="rgba(255,255,255,0.2)"
        strokeWidth="0.3"
      />
      
      {/* Glutes */}
      <path 
        d="M38 108 Q42 105 50 105 Q58 105 62 108 L65 125 Q58 130 50 130 Q42 130 35 125 Z"
        fill={getMuscleFill(intensity.glutes || 0)}
        stroke="rgba(255,255,255,0.2)"
        strokeWidth="0.3"
      />
      
      {/* Hamstrings - Left */}
      <path 
        d="M36 128 L34 150 L32 170 L42 172 L44 152 L44 130 Q40 128 36 128 Z"
        fill={getMuscleFill(intensity.hamstrings || 0)}
        stroke="rgba(255,255,255,0.2)"
        strokeWidth="0.3"
      />
      
      {/* Hamstrings - Right */}
      <path 
        d="M64 128 L66 150 L68 170 L58 172 L56 152 L56 130 Q60 128 64 128 Z"
        fill={getMuscleFill(intensity.hamstrings || 0)}
        stroke="rgba(255,255,255,0.2)"
        strokeWidth="0.3"
      />
      
      {/* Calves - Left back */}
      <path 
        d="M32 172 L30 188 L40 190 L42 175 Z"
        fill={getMuscleFill(intensity.calves || 0)}
        stroke="rgba(255,255,255,0.2)"
        strokeWidth="0.3"
      />
      
      {/* Calves - Right back */}
      <path 
        d="M68 172 L70 188 L60 190 L58 175 Z"
        fill={getMuscleFill(intensity.calves || 0)}
        stroke="rgba(255,255,255,0.2)"
        strokeWidth="0.3"
      />
    </g>
  </svg>
)

export default function MuscleMap({ exercises, className = '' }: MuscleMapProps) {
  const intensity = useMemo(() => calculateMuscleIntensity(exercises), [exercises])
  
  return (
    <div className={`flex gap-1 ${className}`}>
      <div className="flex-1 relative">
        <FrontView intensity={intensity} />
      </div>
      <div className="flex-1 relative">
        <BackView intensity={intensity} />
      </div>
    </div>
  )
}
