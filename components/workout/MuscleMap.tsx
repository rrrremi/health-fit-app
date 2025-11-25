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

// --- ANATOMICAL PATHS ---
// Redesigned for interlocking organic flow
// ViewBox: 0 0 100 200

const SILHOUETTE = {
  front: "M50,5 C45,5 42,8 42,14 C42,20 45,24 50,24 C55,24 58,20 58,14 C58,8 55,5 50,5 M43,22 C43,22 35,24 28,28 C21,32 18,40 18,48 C18,55 22,60 24,70 C25,75 22,80 20,88 C19,95 22,100 25,100 L28,90 C28,90 30,80 30,72 L32,60 C32,60 35,100 35,110 C35,120 32,130 34,145 C36,155 32,165 32,175 C32,185 35,190 38,190 L44,190 C46,180 46,160 46,150 L48,120 L52,120 L54,150 C54,160 54,180 56,190 L62,190 C65,190 68,185 68,175 C68,165 64,155 66,145 C68,130 65,120 65,110 C65,100 68,60 68,60 L70,72 C70,80 72,90 72,90 L75,100 C78,100 81,95 80,88 C78,80 75,75 76,70 C78,60 82,55 82,48 C82,40 79,32 72,28 C65,24 57,22 57,22",
  back:  "M50,5 C45,5 42,8 42,14 C42,20 45,24 50,24 C55,24 58,20 58,14 C58,8 55,5 50,5 M43,22 C43,22 35,24 28,28 C21,32 18,40 18,48 C18,55 22,60 24,70 C25,75 22,80 20,88 C19,95 22,100 25,100 L28,90 C28,90 30,80 30,72 L32,60 C32,60 35,100 35,110 C35,120 32,130 34,145 C36,155 32,165 32,175 C32,185 35,190 38,190 L44,190 C46,180 46,160 46,150 L48,120 L52,120 L54,150 C54,160 54,180 56,190 L62,190 C65,190 68,185 68,175 C68,165 64,155 66,145 C68,130 65,120 65,110 C65,100 68,60 68,60 L70,72 C70,80 72,90 72,90 L75,100 C78,100 81,95 80,88 C78,80 75,75 76,70 C78,60 82,55 82,48 C82,40 79,32 72,28 C65,24 57,22 57,22"
}

const PATHS = {
  front: {
    neck: "M43,22 Q50,25 57,22 L58,25 Q50,28 42,25 Z",
    traps: "M42,24 L32,29 C34,27 38,24 43,22 M58,22 C62,24 66,27 68,29 L58,24",
    shoulders: {
      left: "M42,25 L30,28 C24,31 18,40 20,50 C21,53 24,55 28,58 L32,50 C30,40 35,35 42,25",
      right: "M58,25 L70,28 C76,31 82,40 80,50 C79,53 76,55 72,58 L68,50 C70,40 65,35 58,25"
    },
    chest: {
      left: "M50,28 L42,28 C36,35 32,48 32,52 C38,56 46,54 50,52 Z",
      right: "M50,28 L58,28 C64,35 68,48 68,52 C62,56 54,54 50,52 Z"
    },
    biceps: {
      left: "M28,58 C26,62 24,68 26,72 L30,72 C32,65 32,60 28,58",
      right: "M72,58 C74,62 76,68 74,72 L70,72 C68,65 68,60 72,58"
    },
    forearms: {
      left: "M26,72 C24,76 20,85 22,92 L26,92 L28,76 L30,72",
      right: "M74,72 C76,76 80,85 78,92 L74,92 L72,76 L70,72"
    },
    abs: "M40,52 C38,60 40,85 42,90 L50,92 L58,90 C60,85 62,60 60,52 C56,54 44,54 40,52 M40,65 H60 M41,78 H59",
    obliques: {
      left: "M40,52 C34,55 32,70 34,85 L42,90 C40,80 38,60 40,52",
      right: "M60,52 C66,55 68,70 66,85 L58,90 C60,80 62,60 60,52"
    },
    quads: {
      left: "M34,90 C28,100 28,130 32,145 C38,148 44,145 46,140 C48,120 44,100 42,92 Z",
      right: "M66,90 C72,100 72,130 68,145 C62,148 56,145 54,140 C52,120 56,100 58,92 Z"
    },
    calves: {
      left: "M32,145 C30,155 28,170 32,180 L38,182 C42,175 44,160 46,145",
      right: "M68,145 C70,155 72,170 68,180 L62,182 C58,175 56,160 54,145"
    }
  },
  back: {
    neck: "M44,22 C44,22 43,26 42,28 L58,28 C57,26 56,22 56,22",
    traps: "M50,22 L42,25 C38,28 32,30 32,30 L42,40 L50,50 L58,40 L68,30 C68,30 62,28 58,25 Z",
    shoulders: {
      left: "M32,30 C25,31 22,36 21,44 C21,50 24,54 26,58 L32,50 L38,42",
      right: "M68,30 C75,31 78,36 79,44 C79,50 76,54 74,58 L68,50 L62,42"
    },
    lats: {
      left: "M38,42 L32,55 C30,65 34,78 40,85 L50,90 L50,50 Z",
      right: "M62,42 L68,55 C70,65 66,78 60,85 L50,90 L50,50 Z"
    },
    lower_back: "M40,85 C40,85 42,95 50,95 C58,95 60,85 60,85 L50,90 Z",
    triceps: {
      left: "M26,58 C24,62 23,68 24,72 L30,72 L32,55 Z",
      right: "M74,58 C76,62 77,68 76,72 L70,72 L68,55 Z"
    },
    forearms: {
      left: "M24,72 C22,76 20,85 21,92 L26,92 L28,76 L30,72",
      right: "M76,72 C78,76 80,85 79,92 L74,92 L72,76 L70,72"
    },
    glutes: {
      left: "M40,95 C32,95 30,105 32,115 C38,122 48,120 50,115 L50,95",
      right: "M60,95 C68,95 70,105 68,115 C62,122 52,120 50,115 L50,95"
    },
    hamstrings: {
      left: "M32,115 C30,125 32,140 34,148 C38,150 44,148 46,145 C48,130 48,120 32,115",
      right: "M68,115 C70,125 68,140 66,148 C62,150 56,148 54,145 C52,130 52,120 68,115"
    },
    calves: {
      left: "M34,148 C30,155 30,170 32,180 L38,182 C44,175 46,155 46,145",
      right: "M66,148 C70,155 70,170 68,180 L62,182 C56,175 54,155 54,145"
    }
  }
}

// --- VISUAL UTILS ---

function getFill(intensity: number): string {
  if (intensity <= 0) return 'transparent'
  const opacity = 0.15 + (intensity * 0.85) 
  return `rgba(255, 255, 255, ${opacity.toFixed(2)})`
}

const STROKE_PROPS = {
  stroke: "rgba(255,255,255,0.3)",
  strokeWidth: "0.4",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  vectorEffect: "non-scaling-stroke"
}

// --- COMPONENTS ---

const SVG_VIEWBOX = "15 10 70 190" // Tight crop to zoom in ~15%

const FrontView = ({ intensity }: { intensity: Record<string, number> }) => (
  <svg viewBox={SVG_VIEWBOX} className="w-full h-full overflow-visible">
    <defs>
      <filter id="glow-body" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="1.5" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>
    
    {/* Ghost Silhouette - Always visible */}
    <path d={SILHOUETTE.front} fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
    
    <g filter="url(#glow-body)">
      {/* Core Structure */}
      <path d={PATHS.front.neck} fill={getFill(intensity.neck || 0)} {...STROKE_PROPS} />
      <path d={PATHS.front.traps} fill={getFill(intensity.traps || 0)} {...STROKE_PROPS} />
      
      {/* Upper Body */}
      <path d={PATHS.front.shoulders.left} fill={getFill(intensity.shoulders || 0)} {...STROKE_PROPS} />
      <path d={PATHS.front.shoulders.right} fill={getFill(intensity.shoulders || 0)} {...STROKE_PROPS} />
      <path d={PATHS.front.chest.left} fill={getFill(intensity.chest || 0)} {...STROKE_PROPS} />
      <path d={PATHS.front.chest.right} fill={getFill(intensity.chest || 0)} {...STROKE_PROPS} />
      
      {/* Arms */}
      <path d={PATHS.front.biceps.left} fill={getFill(intensity.biceps || 0)} {...STROKE_PROPS} />
      <path d={PATHS.front.biceps.right} fill={getFill(intensity.biceps || 0)} {...STROKE_PROPS} />
      <path d={PATHS.front.forearms.left} fill={getFill(intensity.forearms || 0)} {...STROKE_PROPS} />
      <path d={PATHS.front.forearms.right} fill={getFill(intensity.forearms || 0)} {...STROKE_PROPS} />
      
      {/* Torso */}
      <path d={PATHS.front.abs} fill={getFill(intensity.core || 0)} {...STROKE_PROPS} />
      <path d={PATHS.front.obliques.left} fill={getFill(intensity.core || 0)} {...STROKE_PROPS} />
      <path d={PATHS.front.obliques.right} fill={getFill(intensity.core || 0)} {...STROKE_PROPS} />
      
      {/* Legs */}
      <path d={PATHS.front.quads.left} fill={getFill(intensity.quads || 0)} {...STROKE_PROPS} />
      <path d={PATHS.front.quads.right} fill={getFill(intensity.quads || 0)} {...STROKE_PROPS} />
      <path d={PATHS.front.calves.left} fill={getFill(intensity.calves || 0)} {...STROKE_PROPS} />
      <path d={PATHS.front.calves.right} fill={getFill(intensity.calves || 0)} {...STROKE_PROPS} />
    </g>
  </svg>
)

const BackView = ({ intensity }: { intensity: Record<string, number> }) => (
  <svg viewBox={SVG_VIEWBOX} className="w-full h-full overflow-visible">
    {/* Ghost Silhouette */}
    <path d={SILHOUETTE.back} fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
    
    <g filter="url(#glow-body)">
      {/* Upper Back */}
      <path d={PATHS.back.neck} fill={getFill(intensity.neck || 0)} {...STROKE_PROPS} />
      <path d={PATHS.back.traps} fill={getFill(intensity.traps || intensity.back || 0)} {...STROKE_PROPS} />
      <path d={PATHS.back.shoulders.left} fill={getFill(intensity.shoulders || 0)} {...STROKE_PROPS} />
      <path d={PATHS.back.shoulders.right} fill={getFill(intensity.shoulders || 0)} {...STROKE_PROPS} />
      
      {/* Lats & Spine */}
      <path d={PATHS.back.lats.left} fill={getFill(intensity.back || 0)} {...STROKE_PROPS} />
      <path d={PATHS.back.lats.right} fill={getFill(intensity.back || 0)} {...STROKE_PROPS} />
      <path d={PATHS.back.lower_back} fill={getFill(intensity.back || intensity.core || 0)} {...STROKE_PROPS} />
      
      {/* Arms */}
      <path d={PATHS.back.triceps.left} fill={getFill(intensity.triceps || 0)} {...STROKE_PROPS} />
      <path d={PATHS.back.triceps.right} fill={getFill(intensity.triceps || 0)} {...STROKE_PROPS} />
      <path d={PATHS.back.forearms.left} fill={getFill(intensity.forearms || 0)} {...STROKE_PROPS} />
      <path d={PATHS.back.forearms.right} fill={getFill(intensity.forearms || 0)} {...STROKE_PROPS} />
      
      {/* Legs */}
      <path d={PATHS.back.glutes.left} fill={getFill(intensity.glutes || 0)} {...STROKE_PROPS} />
      <path d={PATHS.back.glutes.right} fill={getFill(intensity.glutes || 0)} {...STROKE_PROPS} />
      <path d={PATHS.back.hamstrings.left} fill={getFill(intensity.hamstrings || 0)} {...STROKE_PROPS} />
      <path d={PATHS.back.hamstrings.right} fill={getFill(intensity.hamstrings || 0)} {...STROKE_PROPS} />
      <path d={PATHS.back.calves.left} fill={getFill(intensity.calves || 0)} {...STROKE_PROPS} />
      <path d={PATHS.back.calves.right} fill={getFill(intensity.calves || 0)} {...STROKE_PROPS} />
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
