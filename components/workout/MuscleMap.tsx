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
// ViewBox: 0 0 200 400 (Higher resolution coordinate space for precision)

const SILHOUETTE = {
  front: "M100,15 C90,15 84,22 84,35 C84,48 90,55 100,55 C110,55 116,48 116,35 C116,22 110,15 100,15 M86,50 C86,50 75,55 65,65 C55,75 50,90 48,110 C46,130 45,150 40,165 C38,170 30,175 30,190 C30,205 35,210 45,210 C55,210 58,200 60,175 C62,155 65,140 65,140 L70,190 C70,190 72,250 72,260 C72,275 68,290 72,310 C76,330 68,350 68,365 C68,380 72,390 80,390 L90,390 C95,380 98,360 98,340 L98,260 L102,260 L102,340 C102,360 105,380 110,390 L120,390 C128,390 132,380 132,365 C132,350 124,330 128,310 C132,290 128,275 128,260 C128,250 130,190 130,190 L135,140 C135,140 138,155 140,175 C142,200 145,210 155,210 C165,210 170,205 170,190 C170,175 162,170 160,165 C155,150 154,130 152,110 C150,90 145,75 135,65 C125,55 114,50 114,50",
  back:  "M100,15 C90,15 84,22 84,35 C84,48 90,55 100,55 C110,55 116,48 116,35 C116,22 110,15 100,15 M86,50 C86,50 75,55 65,65 C55,75 50,90 48,110 C46,130 45,150 40,165 C38,170 30,175 30,190 C30,205 35,210 45,210 C55,210 58,200 60,175 C62,155 65,140 65,140 L70,190 C70,190 72,250 72,260 C72,275 68,290 72,310 C76,330 68,350 68,365 C68,380 72,390 80,390 L90,390 C95,380 98,360 98,340 L98,260 L102,260 L102,340 C102,360 105,380 110,390 L120,390 C128,390 132,380 132,365 C132,350 124,330 128,310 C132,290 128,275 128,260 C128,250 130,190 130,190 L135,140 C135,140 138,155 140,175 C142,200 145,210 155,210 C165,210 170,205 170,190 C170,175 162,170 160,165 C155,150 154,130 152,110 C150,90 145,75 135,65 C125,55 114,50 114,50"
}

const PATHS = {
  front: {
    neck: "M88,48 C88,48 92,55 100,55 C108,55 112,48 112,48 L110,42 C110,42 105,45 100,45 C95,45 90,42 90,42 Z",
    traps: "M86,50 L68,62 C75,58 85,52 90,45 M114,50 L132,62 C125,58 115,52 110,45",
    shoulders: {
      left: "M68,62 C60,68 50,80 48,95 C48,105 52,110 58,115 L68,100 C65,80 75,70 86,58",
      right: "M132,62 C140,68 150,80 152,95 C152,105 148,110 142,115 L132,100 C135,80 125,70 114,58"
    },
    chest: {
      left: "M100,55 L86,58 C75,65 70,90 72,98 C85,105 95,100 100,98 Z",
      right: "M100,55 L114,58 C125,65 130,90 128,98 C115,105 105,100 100,98 Z"
    },
    biceps: {
      left: "M58,115 C55,125 52,135 55,145 L62,145 C65,135 65,120 58,115",
      right: "M142,115 C145,125 148,135 145,145 L138,145 C135,135 135,120 142,115"
    },
    forearms: {
      left: "M55,145 C50,150 40,165 45,185 L55,185 L60,155 L62,145",
      right: "M145,145 C150,150 160,165 155,185 L145,185 L140,155 L138,145"
    },
    abs: "M80,98 C75,110 80,165 85,175 L100,180 L115,175 C120,165 125,110 120,98 C115,102 85,102 80,98 M80,120 H120 M82,145 H118 M85,165 H115",
    obliques: {
      left: "M72,98 C65,110 65,140 70,170 L85,175 C82,160 80,120 80,98",
      right: "M128,98 C135,110 135,140 130,170 L115,175 C118,160 120,120 120,98"
    },
    quads: {
      left: "M70,175 C60,200 60,260 65,290 C75,295 90,290 95,280 C98,240 95,200 85,175 Z",
      right: "M130,175 C140,200 140,260 135,290 C125,295 110,290 105,280 C102,240 105,200 115,175 Z"
    },
    calves: {
      left: "M65,290 C62,310 60,340 68,360 L80,365 C85,350 90,320 95,290",
      right: "M135,290 C138,310 140,340 132,360 L120,365 C115,350 110,320 105,290"
    }
  },
  back: {
    neck: "M88,45 C88,45 90,52 100,52 C110,52 112,45 112,45 L112,35 C110,35 100,38 88,35 Z",
    traps: "M100,45 L86,50 C78,55 68,60 68,60 L86,80 L100,100 L114,80 L132,60 C132,60 122,55 114,50 Z",
    shoulders: {
      left: "M68,60 C60,65 50,75 48,90 C48,100 52,105 58,115 L68,100 L78,85",
      right: "M132,60 C140,65 150,75 152,90 C152,100 148,105 142,115 L132,100 L122,85"
    },
    lats: {
      left: "M78,85 L68,110 C65,130 72,155 80,170 L100,180 L100,100 Z",
      right: "M122,85 L132,110 C135,130 128,155 120,170 L100,180 L100,100 Z"
    },
    lower_back: "M80,170 C80,170 85,190 100,190 C115,190 120,170 120,170 L100,180 Z",
    triceps: {
      left: "M58,115 C55,125 52,135 55,145 L62,145 L68,110",
      right: "M142,115 C145,125 148,135 145,145 L138,145 L132,110"
    },
    forearms: {
      left: "M55,145 C50,150 40,165 45,185 L55,185 L60,155 L62,145",
      right: "M145,145 C150,150 160,165 155,185 L145,185 L140,155 L138,145"
    },
    glutes: {
      left: "M80,190 C70,190 65,210 68,230 C75,245 95,240 100,230 L100,190",
      right: "M120,190 C130,190 135,210 132,230 C125,245 105,240 100,230 L100,190"
    },
    hamstrings: {
      left: "M68,230 C65,250 68,280 72,295 C80,300 92,295 95,290 C100,260 100,240 68,230",
      right: "M132,230 C135,250 132,280 128,295 C120,300 108,295 105,290 C100,260 100,240 132,230"
    },
    calves: {
      left: "M72,295 C65,310 65,340 68,360 L80,365 C90,350 95,310 95,290",
      right: "M128,295 C135,310 135,340 132,360 L120,365 C110,350 105,310 105,290"
    }
  }
}

// --- VISUAL UTILS ---

function getFill(intensity: number): string {
  if (intensity <= 0) return 'transparent'
  // Brighter white for active muscles
  const opacity = 0.2 + (intensity * 0.8) 
  return `rgba(255, 255, 255, ${opacity.toFixed(2)})`
}

const STROKE_PROPS = {
  stroke: "rgba(255,255,255,0.2)",
  strokeWidth: "0.5",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  vectorEffect: "non-scaling-stroke"
}

// --- COMPONENTS ---

const SVG_VIEWBOX = "20 10 160 400" // Adjusted viewbox for 200x400 system

const FrontView = ({ intensity }: { intensity: Record<string, number> }) => (
  <svg viewBox={SVG_VIEWBOX} className="w-full h-full overflow-visible">
    <defs>
      <filter id="glow-body" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="2" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>
    
    {/* Ghost Silhouette */}
    <path d={SILHOUETTE.front} fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
    
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
    <path d={SILHOUETTE.back} fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
    
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
