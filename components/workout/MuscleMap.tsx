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

// --- HIGH-QUALITY ANATOMICAL PATHS ---
// ViewBox: 0 0 200 480 - Proper 8-head human proportions
// Center at x=100, head size ~50px, total height ~400px

// Clean outer silhouette - single continuous path
const BODY_OUTLINE = {
  front: `
    M100,12 
    C91,12 85,20 85,32 C85,44 91,52 100,52 C109,52 115,44 115,32 C115,20 109,12 100,12
    M92,50 L92,58 C92,58 88,60 82,64 C74,70 66,80 62,95 C58,110 56,125 52,140 
    C50,148 44,155 40,168 C38,178 40,188 46,192 C52,195 58,190 62,178 
    C66,166 68,152 70,140 L72,130 L74,150 C76,175 76,200 76,225 
    C76,250 74,275 76,300 C78,325 74,350 74,372 C74,385 78,395 86,395 
    L94,395 C94,395 96,380 96,355 L98,280 L102,280 L104,355 C104,380 106,395 106,395 
    L114,395 C122,395 126,385 126,372 C126,350 122,325 124,300 
    C126,275 124,250 124,225 C124,200 124,175 126,150 L128,130 L130,140 
    C132,152 134,166 138,178 C142,190 148,195 154,192 C160,188 162,178 160,168 
    C156,155 150,148 148,140 C144,125 142,110 138,95 C134,80 126,70 118,64 
    C112,60 108,58 108,58 L108,50
  `,
  back: `
    M100,12 
    C91,12 85,20 85,32 C85,44 91,52 100,52 C109,52 115,44 115,32 C115,20 109,12 100,12
    M92,50 L92,58 C92,58 88,60 82,64 C74,70 66,80 62,95 C58,110 56,125 52,140 
    C50,148 44,155 40,168 C38,178 40,188 46,192 C52,195 58,190 62,178 
    C66,166 68,152 70,140 L72,130 L74,150 C76,175 76,200 76,225 
    C76,250 74,275 76,300 C78,325 74,350 74,372 C74,385 78,395 86,395 
    L94,395 C94,395 96,380 96,355 L98,280 L102,280 L104,355 C104,380 106,395 106,395 
    L114,395 C122,395 126,385 126,372 C126,350 122,325 124,300 
    C126,275 124,250 124,225 C124,200 124,175 126,150 L128,130 L130,140 
    C132,152 134,166 138,178 C142,190 148,195 154,192 C160,188 162,178 160,168 
    C156,155 150,148 148,140 C144,125 142,110 138,95 C134,80 126,70 118,64 
    C112,60 108,58 108,58 L108,50
  `
}

// Muscle regions - designed to fit within silhouette without overlap
const MUSCLES = {
  front: {
    // Neck
    neck: "M92,50 C92,54 95,56 100,56 C105,56 108,54 108,50 L106,48 C106,48 103,50 100,50 C97,50 94,48 94,48 Z",
    
    // Trapezius (visible from front as shoulder-neck connection)
    traps: {
      left: "M92,56 C88,58 82,62 78,68 L84,72 C88,68 92,62 94,58 Z",
      right: "M108,56 C112,58 118,62 122,68 L116,72 C112,68 108,62 106,58 Z"
    },
    
    // Deltoids
    shoulders: {
      left: "M78,68 C70,74 64,85 62,100 C64,108 68,112 72,116 L78,105 C76,92 80,80 84,72 Z",
      right: "M122,68 C130,74 136,85 138,100 C136,108 132,112 128,116 L122,105 C124,92 120,80 116,72 Z"
    },
    
    // Pectorals
    chest: {
      left: "M100,60 L92,62 C84,68 78,85 80,100 C88,108 96,105 100,102 Z",
      right: "M100,60 L108,62 C116,68 122,85 120,100 C112,108 104,105 100,102 Z"
    },
    
    // Biceps
    biceps: {
      left: "M72,116 C68,125 66,138 68,150 L76,150 C78,138 78,125 76,116 Z",
      right: "M128,116 C132,125 134,138 132,150 L124,150 C122,138 122,125 124,116 Z"
    },
    
    // Forearms
    forearms: {
      left: "M68,150 C64,160 56,175 58,188 L68,188 L74,160 L76,150 Z",
      right: "M132,150 C136,160 144,175 142,188 L132,188 L126,160 L124,150 Z"
    },
    
    // Rectus Abdominis (6-pack)
    abs: "M88,102 C86,115 86,145 88,165 L100,170 L112,165 C114,145 114,115 112,102 C108,106 92,106 88,102",
    
    // Obliques
    obliques: {
      left: "M80,100 C76,115 76,145 78,170 L88,168 C86,145 86,115 88,102 Z",
      right: "M120,100 C124,115 124,145 122,170 L112,168 C114,145 114,115 112,102 Z"
    },
    
    // Quadriceps
    quads: {
      left: "M78,172 C72,190 72,240 76,280 C82,288 92,285 96,278 C100,250 96,200 88,172 Z",
      right: "M122,172 C128,190 128,240 124,280 C118,288 108,285 104,278 C100,250 104,200 112,172 Z"
    },
    
    // Calves (front - tibialis)
    calves: {
      left: "M76,282 C74,300 72,330 78,360 L88,362 C92,340 94,310 96,282 Z",
      right: "M124,282 C126,300 128,330 122,360 L112,362 C108,340 106,310 104,282 Z"
    }
  },
  
  back: {
    // Neck
    neck: "M92,50 C92,54 95,56 100,56 C105,56 108,54 108,50 L106,48 C106,48 103,50 100,50 C97,50 94,48 94,48 Z",
    
    // Trapezius (diamond shape on back)
    traps: "M100,52 L88,58 C82,64 78,70 78,70 L88,82 L100,95 L112,82 L122,70 C122,70 118,64 112,58 Z",
    
    // Rear Deltoids
    shoulders: {
      left: "M78,70 C70,76 64,88 62,102 C64,110 68,114 72,118 L78,106 C76,92 80,80 84,74 Z",
      right: "M122,70 C130,76 136,88 138,102 C136,110 132,114 128,118 L122,106 C124,92 120,80 116,74 Z"
    },
    
    // Latissimus Dorsi
    lats: {
      left: "M88,82 L78,100 C74,120 78,150 84,170 L100,178 L100,95 Z",
      right: "M112,82 L122,100 C126,120 122,150 116,170 L100,178 L100,95 Z"
    },
    
    // Lower Back / Erector Spinae
    lower_back: "M84,170 C84,170 90,185 100,185 C110,185 116,170 116,170 L100,178 Z",
    
    // Triceps
    triceps: {
      left: "M72,118 C68,128 66,142 68,155 L76,155 L80,130 Z",
      right: "M128,118 C132,128 134,142 132,155 L124,155 L120,130 Z"
    },
    
    // Forearms
    forearms: {
      left: "M68,155 C64,165 56,180 58,192 L68,192 L74,165 L76,155 Z",
      right: "M132,155 C136,165 144,180 142,192 L132,192 L126,165 L124,155 Z"
    },
    
    // Gluteus
    glutes: {
      left: "M84,185 C76,188 74,205 76,222 C82,235 96,232 100,225 L100,185 Z",
      right: "M116,185 C124,188 126,205 124,222 C118,235 104,232 100,225 L100,185 Z"
    },
    
    // Hamstrings
    hamstrings: {
      left: "M76,225 C72,245 74,275 78,295 C84,302 94,298 98,292 C102,260 100,235 76,225 Z",
      right: "M124,225 C128,245 126,275 122,295 C116,302 106,298 102,292 C98,260 100,235 124,225 Z"
    },
    
    // Calves (gastrocnemius)
    calves: {
      left: "M78,295 C72,315 72,345 78,368 L88,370 C94,350 98,315 98,295 Z",
      right: "M122,295 C128,315 128,345 122,368 L112,370 C106,350 102,315 102,295 Z"
    }
  }
}

// --- VISUAL UTILS ---

function getFill(intensity: number): string {
  if (intensity <= 0) return 'transparent'
  const opacity = 0.25 + (intensity * 0.75)
  return `rgba(255, 255, 255, ${opacity.toFixed(2)})`
}

// --- COMPONENTS ---

const SVG_VIEWBOX = "30 5 140 400"

const OUTLINE_STYLE = {
  fill: "rgba(255,255,255,0.03)",
  stroke: "rgba(255,255,255,0.12)",
  strokeWidth: 1.2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const
}

const MUSCLE_STYLE = {
  stroke: "rgba(255,255,255,0.08)",
  strokeWidth: 0.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const
}

const FrontView = ({ intensity }: { intensity: Record<string, number> }) => (
  <svg viewBox={SVG_VIEWBOX} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
    <defs>
      <filter id="muscle-glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="3" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>
    
    {/* Body outline */}
    <path d={BODY_OUTLINE.front} {...OUTLINE_STYLE} />
    
    {/* Muscle groups with glow */}
    <g filter="url(#muscle-glow)">
      <path d={MUSCLES.front.neck} fill={getFill(intensity.neck || 0)} {...MUSCLE_STYLE} />
      
      <path d={MUSCLES.front.traps.left} fill={getFill(intensity.back || 0)} {...MUSCLE_STYLE} />
      <path d={MUSCLES.front.traps.right} fill={getFill(intensity.back || 0)} {...MUSCLE_STYLE} />
      
      <path d={MUSCLES.front.shoulders.left} fill={getFill(intensity.shoulders || 0)} {...MUSCLE_STYLE} />
      <path d={MUSCLES.front.shoulders.right} fill={getFill(intensity.shoulders || 0)} {...MUSCLE_STYLE} />
      
      <path d={MUSCLES.front.chest.left} fill={getFill(intensity.chest || 0)} {...MUSCLE_STYLE} />
      <path d={MUSCLES.front.chest.right} fill={getFill(intensity.chest || 0)} {...MUSCLE_STYLE} />
      
      <path d={MUSCLES.front.biceps.left} fill={getFill(intensity.biceps || 0)} {...MUSCLE_STYLE} />
      <path d={MUSCLES.front.biceps.right} fill={getFill(intensity.biceps || 0)} {...MUSCLE_STYLE} />
      
      <path d={MUSCLES.front.forearms.left} fill={getFill(intensity.forearms || 0)} {...MUSCLE_STYLE} />
      <path d={MUSCLES.front.forearms.right} fill={getFill(intensity.forearms || 0)} {...MUSCLE_STYLE} />
      
      <path d={MUSCLES.front.abs} fill={getFill(intensity.core || 0)} {...MUSCLE_STYLE} />
      <path d={MUSCLES.front.obliques.left} fill={getFill(intensity.core || 0)} {...MUSCLE_STYLE} />
      <path d={MUSCLES.front.obliques.right} fill={getFill(intensity.core || 0)} {...MUSCLE_STYLE} />
      
      <path d={MUSCLES.front.quads.left} fill={getFill(intensity.quads || 0)} {...MUSCLE_STYLE} />
      <path d={MUSCLES.front.quads.right} fill={getFill(intensity.quads || 0)} {...MUSCLE_STYLE} />
      
      <path d={MUSCLES.front.calves.left} fill={getFill(intensity.calves || 0)} {...MUSCLE_STYLE} />
      <path d={MUSCLES.front.calves.right} fill={getFill(intensity.calves || 0)} {...MUSCLE_STYLE} />
    </g>
  </svg>
)

const BackView = ({ intensity }: { intensity: Record<string, number> }) => (
  <svg viewBox={SVG_VIEWBOX} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
    <defs>
      <filter id="muscle-glow-back" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="3" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>
    
    {/* Body outline */}
    <path d={BODY_OUTLINE.back} {...OUTLINE_STYLE} />
    
    {/* Muscle groups with glow */}
    <g filter="url(#muscle-glow-back)">
      <path d={MUSCLES.back.neck} fill={getFill(intensity.neck || 0)} {...MUSCLE_STYLE} />
      <path d={MUSCLES.back.traps} fill={getFill(intensity.back || 0)} {...MUSCLE_STYLE} />
      
      <path d={MUSCLES.back.shoulders.left} fill={getFill(intensity.shoulders || 0)} {...MUSCLE_STYLE} />
      <path d={MUSCLES.back.shoulders.right} fill={getFill(intensity.shoulders || 0)} {...MUSCLE_STYLE} />
      
      <path d={MUSCLES.back.lats.left} fill={getFill(intensity.back || 0)} {...MUSCLE_STYLE} />
      <path d={MUSCLES.back.lats.right} fill={getFill(intensity.back || 0)} {...MUSCLE_STYLE} />
      <path d={MUSCLES.back.lower_back} fill={getFill(intensity.back || intensity.core || 0)} {...MUSCLE_STYLE} />
      
      <path d={MUSCLES.back.triceps.left} fill={getFill(intensity.triceps || 0)} {...MUSCLE_STYLE} />
      <path d={MUSCLES.back.triceps.right} fill={getFill(intensity.triceps || 0)} {...MUSCLE_STYLE} />
      
      <path d={MUSCLES.back.forearms.left} fill={getFill(intensity.forearms || 0)} {...MUSCLE_STYLE} />
      <path d={MUSCLES.back.forearms.right} fill={getFill(intensity.forearms || 0)} {...MUSCLE_STYLE} />
      
      <path d={MUSCLES.back.glutes.left} fill={getFill(intensity.glutes || 0)} {...MUSCLE_STYLE} />
      <path d={MUSCLES.back.glutes.right} fill={getFill(intensity.glutes || 0)} {...MUSCLE_STYLE} />
      
      <path d={MUSCLES.back.hamstrings.left} fill={getFill(intensity.hamstrings || 0)} {...MUSCLE_STYLE} />
      <path d={MUSCLES.back.hamstrings.right} fill={getFill(intensity.hamstrings || 0)} {...MUSCLE_STYLE} />
      
      <path d={MUSCLES.back.calves.left} fill={getFill(intensity.calves || 0)} {...MUSCLE_STYLE} />
      <path d={MUSCLES.back.calves.right} fill={getFill(intensity.calves || 0)} {...MUSCLE_STYLE} />
    </g>
  </svg>
)

export default function MuscleMap({ exercises, className = '' }: MuscleMapProps) {
  const intensity = useMemo(() => calculateMuscleIntensity(exercises), [exercises])
  
  return (
    <div className={`flex gap-3 ${className}`}>
      <div className="flex-1">
        <FrontView intensity={intensity} />
      </div>
      <div className="flex-1">
        <BackView intensity={intensity} />
      </div>
    </div>
  )
}
