'use client'

import { useMemo } from 'react'
import { Exercise } from '@/types/workout'

interface MuscleMapProps {
  exercises: Exercise[]
  className?: string
}

// --- MUSCLE MAPPING LOGIC ---

const MUSCLE_ALIASES: Record<string, string[]> = {
  chest: ['chest', 'pectorals', 'pecs', 'pectoralis'],
  back: ['back', 'lats', 'latissimus', 'rhomboids', 'upper back', 'lower back', 'erector', 'traps', 'trapezius'],
  shoulders: ['shoulders', 'deltoids', 'delts', 'front delts', 'rear delts', 'lateral delts'],
  biceps: ['biceps', 'bicep', 'brachialis'],
  triceps: ['triceps', 'tricep'],
  forearms: ['forearms', 'forearm', 'wrists', 'grip', 'brachioradialis'],
  core: ['core', 'abs', 'abdominals', 'obliques', 'rectus abdominis', 'transverse'],
  quads: ['quads', 'quadriceps', 'thighs', 'front thighs', 'rectus femoris', 'vastus'],
  hamstrings: ['hamstrings', 'hamstring', 'rear thighs', 'biceps femoris'],
  glutes: ['glutes', 'gluteus', 'buttocks', 'hips'],
  calves: ['calves', 'calf', 'gastrocnemius', 'soleus', 'tibialis'],
  neck: ['neck', 'sternocleidomastoid'],
}

function normalizeMuscle(muscle: string): string | null {
  const lower = muscle.toLowerCase().trim()
  for (const [key, aliases] of Object.entries(MUSCLE_ALIASES)) {
    if (aliases.some(alias => lower.includes(alias) || alias.includes(lower))) {
      return key
    }
  }
  if (lower.includes('full body') || lower.includes('compound') || lower.includes('total body')) {
    return 'full_body'
  }
  return null
}

function calculateMuscleIntensity(exercises: Exercise[]): Record<string, number> {
  const counts: Record<string, number> = {}
  
  exercises.forEach(exercise => {
    const muscles = exercise.primary_muscles || []
    muscles.forEach(muscle => {
      const normalized = normalizeMuscle(muscle)
      if (normalized === 'full_body') {
        Object.keys(MUSCLE_ALIASES).forEach(key => {
          counts[key] = (counts[key] || 0) + 0.5
        })
      } else if (normalized) {
        counts[normalized] = (counts[normalized] || 0) + 1
      }
    })
  })
  
  const maxCount = Math.max(...Object.values(counts), 1)
  const intensity: Record<string, number> = {}
  for (const [key, count] of Object.entries(counts)) {
    intensity[key] = Math.min(count / maxCount, 1)
  }
  
  return intensity
}

// --- ANATOMICAL PATHS (Normalized to 100x200 viewbox) ---
// "Top notch" approximations using organic bezier curves
const PATHS = {
  // Front View
  front: {
    head: "M50,2 C45,2 41,6 41,12 C41,19 45,24 50,24 C55,24 59,19 59,12 C59,6 55,2 50,2 Z",
    neck: "M44,22 C44,22 43,28 41,30 L59,30 C57,28 56,22 56,22",
    traps: "M41,30 L32,32 C32,32 36,28 41,26 L59,26 C64,28 68,32 68,32 L59,30",
    shoulders: {
      left: "M32,32 C25,33 22,38 21,45 C21,52 24,55 26,58 L32,52 C34,45 35,38 32,32",
      right: "M68,32 C75,33 78,38 79,45 C79,52 76,55 74,58 L68,52 C66,45 65,38 68,32"
    },
    chest: {
      left: "M50,32 L41,32 C35,38 32,52 34,55 C40,58 48,55 50,52 Z",
      right: "M50,32 L59,32 C65,38 68,52 66,55 C60,58 52,55 50,52 Z"
    },
    biceps: {
      left: "M26,58 C24,62 23,68 24,72 C25,75 28,74 30,72 L32,58 Z",
      right: "M74,58 C76,62 77,68 76,72 C75,75 72,74 70,72 L68,58 Z"
    },
    forearms: {
      left: "M24,72 C22,76 20,85 21,92 C22,95 25,94 26,92 L28,76 Z",
      right: "M76,72 C78,76 80,85 79,92 C78,95 75,94 74,92 L72,76 Z"
    },
    abs: "M42,58 C42,58 44,90 50,90 C56,90 58,58 58,58 C55,55 45,55 42,58 M42,68 H58 M43,78 H57",
    obliques: {
      left: "M42,58 C38,60 34,75 36,88 L42,90 C40,80 41,65 42,58",
      right: "M58,58 C62,60 66,75 64,88 L58,90 C60,80 59,65 58,58"
    },
    quads: {
      left: "M36,92 C30,100 28,130 32,145 C36,150 42,148 44,145 C46,130 44,100 42,92 Z",
      right: "M64,92 C70,100 72,130 68,145 C64,150 58,148 56,145 C54,130 56,100 58,92 Z"
    },
    calves: {
      left: "M32,148 C30,155 28,170 30,180 C32,185 36,185 38,180 C40,170 38,155 44,148 Z",
      right: "M68,148 C70,155 72,170 70,180 C68,185 64,185 62,180 C60,170 62,155 56,148 Z"
    }
  },
  
  // Back View
  back: {
    head: "M50,2 C45,2 41,6 41,12 C41,19 45,24 50,24 C55,24 59,19 59,12 C59,6 55,2 50,2 Z",
    neck: "M44,22 C43,28 41,30 L59,30 C57,28 56,22 56,22",
    traps: "M50,22 L41,26 C36,28 32,32 32,32 L44,38 L50,50 L56,38 L68,32 C68,32 64,28 59,26 Z",
    shoulders: {
      left: "M32,32 C25,33 22,38 21,45 C21,52 24,55 26,58 L32,52 C34,45 35,38 32,32",
      right: "M68,32 C75,33 78,38 79,45 C79,52 76,55 74,58 L68,52 C66,45 65,38 68,32"
    },
    lats: {
      left: "M44,38 L34,45 C32,60 36,75 42,82 L50,85 L50,50 Z",
      right: "M56,38 L66,45 C68,60 64,75 58,82 L50,85 L50,50 Z"
    },
    lower_back: "M42,82 C42,82 44,92 50,92 C56,92 58,82 58,82 L50,85 Z",
    triceps: {
      left: "M26,58 C24,62 23,68 24,72 C25,75 28,74 30,72 L32,58 Z",
      right: "M74,58 C76,62 77,68 76,72 C75,75 72,74 70,72 L68,58 Z"
    },
    forearms: {
      left: "M24,72 C22,76 20,85 21,92 C22,95 25,94 26,92 L28,76 Z",
      right: "M76,72 C78,76 80,85 79,92 C78,95 75,94 74,92 L72,76 Z"
    },
    glutes: {
      left: "M42,92 C35,94 32,105 34,115 C38,120 48,120 50,115 L50,92 Z",
      right: "M58,92 C65,94 68,105 66,115 C62,120 52,120 50,115 L50,92 Z"
    },
    hamstrings: {
      left: "M34,118 C32,125 32,140 34,148 C38,150 42,148 44,145 C46,130 46,120 34,118 Z",
      right: "M66,118 C68,125 68,140 66,148 C62,150 58,148 56,145 C54,130 54,120 66,118 Z"
    },
    calves: {
      left: "M34,148 C30,155 30,170 32,180 C36,185 38,185 40,180 C42,170 42,155 44,148 Z",
      right: "M66,148 C70,155 70,170 68,180 C64,185 62,185 60,180 C58,170 58,155 56,148 Z"
    }
  }
}

// --- VISUAL UTILS ---

function getFill(intensity: number): string {
  if (intensity <= 0) return 'transparent'
  const opacity = 0.15 + (intensity * 0.85) // Higher contrast: 0.15 to 1.0
  return `rgba(255, 255, 255, ${opacity.toFixed(2)})`
}

// Shared props for SVG paths
const PATH_PROPS = {
  stroke: "rgba(255,255,255,0.4)",
  strokeWidth: "0.5",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  vectorEffect: "non-scaling-stroke"
}

// --- COMPONENTS ---

const FrontView = ({ intensity }: { intensity: Record<string, number> }) => (
  <svg viewBox="0 0 100 200" className="w-full h-full overflow-visible">
    <defs>
      <filter id="glow-front" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="2" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>
    
    <g filter="url(#glow-front)">
      {/* Head & Neck */}
      <path d={PATHS.front.head} fill="rgba(255,255,255,0.05)" {...PATH_PROPS} />
      <path d={PATHS.front.neck} fill={getFill(intensity.neck || intensity.traps || 0)} {...PATH_PROPS} />
      <path d={PATHS.front.traps} fill={getFill(intensity.traps || 0)} {...PATH_PROPS} />
      
      {/* Upper Body */}
      <path d={PATHS.front.shoulders.left} fill={getFill(intensity.shoulders || 0)} {...PATH_PROPS} />
      <path d={PATHS.front.shoulders.right} fill={getFill(intensity.shoulders || 0)} {...PATH_PROPS} />
      <path d={PATHS.front.chest.left} fill={getFill(intensity.chest || 0)} {...PATH_PROPS} />
      <path d={PATHS.front.chest.right} fill={getFill(intensity.chest || 0)} {...PATH_PROPS} />
      
      {/* Arms */}
      <path d={PATHS.front.biceps.left} fill={getFill(intensity.biceps || 0)} {...PATH_PROPS} />
      <path d={PATHS.front.biceps.right} fill={getFill(intensity.biceps || 0)} {...PATH_PROPS} />
      <path d={PATHS.front.forearms.left} fill={getFill(intensity.forearms || 0)} {...PATH_PROPS} />
      <path d={PATHS.front.forearms.right} fill={getFill(intensity.forearms || 0)} {...PATH_PROPS} />
      
      {/* Core */}
      <path d={PATHS.front.abs} fill={getFill(intensity.core || 0)} {...PATH_PROPS} />
      <path d={PATHS.front.obliques.left} fill={getFill(intensity.core || 0)} {...PATH_PROPS} />
      <path d={PATHS.front.obliques.right} fill={getFill(intensity.core || 0)} {...PATH_PROPS} />
      
      {/* Legs */}
      <path d={PATHS.front.quads.left} fill={getFill(intensity.quads || 0)} {...PATH_PROPS} />
      <path d={PATHS.front.quads.right} fill={getFill(intensity.quads || 0)} {...PATH_PROPS} />
      <path d={PATHS.front.calves.left} fill={getFill(intensity.calves || 0)} {...PATH_PROPS} />
      <path d={PATHS.front.calves.right} fill={getFill(intensity.calves || 0)} {...PATH_PROPS} />
    </g>
  </svg>
)

const BackView = ({ intensity }: { intensity: Record<string, number> }) => (
  <svg viewBox="0 0 100 200" className="w-full h-full overflow-visible">
    <g filter="url(#glow-front)">
      {/* Head & Neck */}
      <path d={PATHS.back.head} fill="rgba(255,255,255,0.05)" {...PATH_PROPS} />
      <path d={PATHS.back.neck} fill={getFill(intensity.neck || intensity.traps || 0)} {...PATH_PROPS} />
      <path d={PATHS.back.traps} fill={getFill(intensity.traps || intensity.back || 0)} {...PATH_PROPS} />
      
      {/* Upper Body */}
      <path d={PATHS.back.shoulders.left} fill={getFill(intensity.shoulders || 0)} {...PATH_PROPS} />
      <path d={PATHS.back.shoulders.right} fill={getFill(intensity.shoulders || 0)} {...PATH_PROPS} />
      <path d={PATHS.back.lats.left} fill={getFill(intensity.back || 0)} {...PATH_PROPS} />
      <path d={PATHS.back.lats.right} fill={getFill(intensity.back || 0)} {...PATH_PROPS} />
      <path d={PATHS.back.lower_back} fill={getFill(intensity.back || intensity.core || 0)} {...PATH_PROPS} />
      
      {/* Arms */}
      <path d={PATHS.back.triceps.left} fill={getFill(intensity.triceps || 0)} {...PATH_PROPS} />
      <path d={PATHS.back.triceps.right} fill={getFill(intensity.triceps || 0)} {...PATH_PROPS} />
      <path d={PATHS.back.forearms.left} fill={getFill(intensity.forearms || 0)} {...PATH_PROPS} />
      <path d={PATHS.back.forearms.right} fill={getFill(intensity.forearms || 0)} {...PATH_PROPS} />
      
      {/* Legs */}
      <path d={PATHS.back.glutes.left} fill={getFill(intensity.glutes || 0)} {...PATH_PROPS} />
      <path d={PATHS.back.glutes.right} fill={getFill(intensity.glutes || 0)} {...PATH_PROPS} />
      <path d={PATHS.back.hamstrings.left} fill={getFill(intensity.hamstrings || 0)} {...PATH_PROPS} />
      <path d={PATHS.back.hamstrings.right} fill={getFill(intensity.hamstrings || 0)} {...PATH_PROPS} />
      <path d={PATHS.back.calves.left} fill={getFill(intensity.calves || 0)} {...PATH_PROPS} />
      <path d={PATHS.back.calves.right} fill={getFill(intensity.calves || 0)} {...PATH_PROPS} />
    </g>
  </svg>
)

export default function MuscleMap({ exercises, className = '' }: MuscleMapProps) {
  const intensity = useMemo(() => calculateMuscleIntensity(exercises), [exercises])
  
  return (
    <div className={`flex gap-2 ${className}`}>
      <div className="flex-1 relative">
        <FrontView intensity={intensity} />
      </div>
      <div className="flex-1 relative">
        <BackView intensity={intensity} />
      </div>
    </div>
  )
}
