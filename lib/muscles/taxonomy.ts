/**
 * Centralized Muscle Taxonomy
 * 
 * Single source of truth for all muscle group definitions.
 * Used by: workout generation, exercise picker, filters, muscle map visualization.
 * 
 * Structure: 8 Top-Level Groups → Sub-Muscles
 * Selection: User can select whole group OR specific sub-muscles
 */

// --- TYPES ---

export interface SubMuscle {
  id: string
  label: string
  aliases: string[]  // For matching exercise data
}

export interface MuscleGroup {
  id: string
  label: string
  icon?: string
  subMuscles: SubMuscle[]
}

export interface MuscleSelection {
  groupId: string
  specific: string[] | null  // null = whole group, array = specific sub-muscles
}

// --- TAXONOMY DATA ---

export const MUSCLE_TAXONOMY: MuscleGroup[] = [
  {
    id: 'chest',
    label: 'Chest',
    subMuscles: [
      { id: 'upper_chest', label: 'Upper Chest', aliases: ['upper pectoralis', 'clavicular', 'incline'] },
      { id: 'mid_chest', label: 'Mid Chest', aliases: ['mid pectoralis', 'sternal', 'flat'] },
      { id: 'lower_chest', label: 'Lower Chest', aliases: ['lower pectoralis', 'decline', 'abdominal head'] },
    ]
  },
  {
    id: 'back',
    label: 'Back',
    subMuscles: [
      { id: 'upper_back', label: 'Upper Back & Traps', aliases: ['trapezius', 'traps', 'rhomboids', 'upper back'] },
      { id: 'lats', label: 'Lats', aliases: ['latissimus', 'latissimus dorsi', 'lat'] },
      { id: 'mid_back', label: 'Mid Back', aliases: ['mid back', 'teres', 'rhomboid'] },
      { id: 'lower_back', label: 'Lower Back', aliases: ['lower back', 'erector', 'erector spinae', 'lumbar'] },
    ]
  },
  {
    id: 'shoulders',
    label: 'Shoulders',
    subMuscles: [
      { id: 'front_delts', label: 'Front Delts', aliases: ['anterior deltoid', 'front deltoid', 'anterior delt'] },
      { id: 'side_delts', label: 'Side Delts', aliases: ['lateral deltoid', 'side deltoid', 'lateral delt', 'medial delt'] },
      { id: 'rear_delts', label: 'Rear Delts', aliases: ['posterior deltoid', 'rear deltoid', 'posterior delt'] },
    ]
  },
  {
    id: 'arms',
    label: 'Arms',
    subMuscles: [
      { id: 'biceps', label: 'Biceps', aliases: ['biceps', 'bicep', 'biceps brachii', 'brachialis'] },
      { id: 'triceps', label: 'Triceps', aliases: ['triceps', 'tricep', 'triceps brachii'] },
      { id: 'forearms', label: 'Forearms', aliases: ['forearm', 'forearms', 'wrist', 'grip', 'brachioradialis'] },
    ]
  },
  {
    id: 'core',
    label: 'Core',
    subMuscles: [
      { id: 'upper_abs', label: 'Upper Abs', aliases: ['upper abs', 'rectus abdominis', 'six pack'] },
      { id: 'lower_abs', label: 'Lower Abs', aliases: ['lower abs', 'lower abdominals'] },
      { id: 'obliques', label: 'Obliques', aliases: ['oblique', 'obliques', 'external oblique', 'internal oblique'] },
    ]
  },
  {
    id: 'legs',
    label: 'Legs',
    subMuscles: [
      { id: 'quads', label: 'Quads', aliases: ['quadriceps', 'quads', 'quad', 'vastus', 'rectus femoris'] },
      { id: 'hamstrings', label: 'Hamstrings', aliases: ['hamstring', 'hamstrings', 'biceps femoris'] },
      { id: 'glutes', label: 'Glutes', aliases: ['glute', 'glutes', 'gluteus', 'buttocks', 'hip'] },
      { id: 'hip_flexors', label: 'Hip Flexors', aliases: ['hip flexor', 'hip flexors', 'iliopsoas', 'psoas'] },
      { id: 'adductors', label: 'Adductors', aliases: ['adductor', 'adductors', 'inner thigh', 'groin'] },
    ]
  },
  {
    id: 'calves',
    label: 'Calves',
    subMuscles: [
      { id: 'gastrocnemius', label: 'Gastrocnemius', aliases: ['gastrocnemius', 'gastroc', 'upper calf'] },
      { id: 'soleus', label: 'Soleus', aliases: ['soleus', 'lower calf'] },
    ]
  },
  {
    id: 'neck',
    label: 'Neck',
    subMuscles: [
      { id: 'neck_flexors', label: 'Neck Flexors', aliases: ['sternocleidomastoid', 'neck', 'neck flexor'] },
      { id: 'neck_extensors', label: 'Neck Extensors', aliases: ['neck extensor', 'upper trap'] },
    ]
  },
]

// --- HELPER FUNCTIONS ---

/**
 * Get all muscle groups (top level only)
 */
export function getAllGroups(): MuscleGroup[] {
  return MUSCLE_TAXONOMY
}

/**
 * Get a specific muscle group by ID
 */
export function getGroupById(groupId: string): MuscleGroup | undefined {
  return MUSCLE_TAXONOMY.find(g => g.id === groupId)
}

/**
 * Get all sub-muscles across all groups (flat list)
 */
export function getAllSubMuscles(): SubMuscle[] {
  return MUSCLE_TAXONOMY.flatMap(g => g.subMuscles)
}

/**
 * Find which group a sub-muscle belongs to
 */
export function getGroupForSubMuscle(subMuscleId: string): MuscleGroup | undefined {
  return MUSCLE_TAXONOMY.find(g => g.subMuscles.some(sm => sm.id === subMuscleId))
}

/**
 * Normalize any muscle string to a sub-muscle ID using aliases
 */
export function normalizeToSubMuscle(muscle: string): { groupId: string; subMuscleId: string } | null {
  const lower = muscle.toLowerCase().trim()
  
  for (const group of MUSCLE_TAXONOMY) {
    // Check if it matches a sub-muscle
    for (const sub of group.subMuscles) {
      if (sub.id === lower || sub.label.toLowerCase() === lower) {
        return { groupId: group.id, subMuscleId: sub.id }
      }
      for (const alias of sub.aliases) {
        if (lower.includes(alias) || alias.includes(lower)) {
          return { groupId: group.id, subMuscleId: sub.id }
        }
      }
    }
    
    // Check if it matches the group itself
    if (group.id === lower || group.label.toLowerCase() === lower) {
      return { groupId: group.id, subMuscleId: group.subMuscles[0]?.id || group.id }
    }
  }
  
  return null
}

/**
 * Normalize any muscle string to a group ID
 */
export function normalizeToGroup(muscle: string): string | null {
  const result = normalizeToSubMuscle(muscle)
  return result?.groupId || null
}

/**
 * Format muscle selections for prompt
 * Example: [{ groupId: "back", specific: ["lower_back"] }] → "back (lower back)"
 * Example: [{ groupId: "chest", specific: null }] → "chest"
 */
export function formatSelectionsForPrompt(selections: MuscleSelection[]): string {
  return selections.map(s => {
    const group = getGroupById(s.groupId)
    if (!group) return s.groupId
    
    if (!s.specific || s.specific.length === 0) {
      return group.label.toLowerCase()
    }
    
    if (s.specific.length === group.subMuscles.length) {
      // All sub-muscles selected = whole group
      return group.label.toLowerCase()
    }
    
    const subLabels = s.specific
      .map(subId => group.subMuscles.find(sm => sm.id === subId)?.label)
      .filter(Boolean)
      .join(', ')
    
    return `${group.label.toLowerCase()} (${subLabels.toLowerCase()})`
  }).join(', ')
}

/**
 * Parse a muscle focus array (from DB or API) into MuscleSelection format
 */
export function parseMuscleFocus(muscleFocus: string[]): MuscleSelection[] {
  const groupMap = new Map<string, Set<string>>()
  
  for (const muscle of muscleFocus) {
    const normalized = normalizeToSubMuscle(muscle)
    if (normalized) {
      if (!groupMap.has(normalized.groupId)) {
        groupMap.set(normalized.groupId, new Set())
      }
      groupMap.get(normalized.groupId)!.add(normalized.subMuscleId)
    }
  }
  
  return Array.from(groupMap.entries()).map(([groupId, subMuscles]) => {
    const group = getGroupById(groupId)
    // If all sub-muscles are selected, treat as whole group
    if (group && subMuscles.size === group.subMuscles.length) {
      return { groupId, specific: null }
    }
    return { groupId, specific: Array.from(subMuscles) }
  })
}

/**
 * Convert MuscleSelection array to flat string array for DB storage
 */
export function selectionsToArray(selections: MuscleSelection[]): string[] {
  const result: string[] = []
  
  for (const sel of selections) {
    const group = getGroupById(sel.groupId)
    if (!group) continue
    
    if (!sel.specific || sel.specific.length === 0) {
      // Whole group - add all sub-muscles
      result.push(...group.subMuscles.map(sm => sm.id))
    } else {
      result.push(...sel.specific)
    }
  }
  
  return result
}

/**
 * Get group IDs from selections (for simple filtering)
 */
export function selectionsToGroupIds(selections: MuscleSelection[]): string[] {
  return selections.map(s => s.groupId)
}

/**
 * Legacy mapping: Convert old muscle group names to new taxonomy
 */
export function mapLegacyMuscle(legacyName: string): string | null {
  const mappings: Record<string, string> = {
    'pectorals': 'chest',
    'pecs': 'chest',
    'lats': 'back',
    'latissimus': 'back',
    'traps': 'back',
    'trapezius': 'back',
    'deltoids': 'shoulders',
    'delts': 'shoulders',
    'biceps': 'arms',
    'triceps': 'arms',
    'forearms': 'arms',
    'abs': 'core',
    'abdominals': 'core',
    'obliques': 'core',
    'quadriceps': 'legs',
    'quads': 'legs',
    'hamstrings': 'legs',
    'glutes': 'legs',
    'gluteus': 'legs',
    'calves': 'calves',
    'calf': 'calves',
    'neck': 'neck',
  }
  
  const lower = legacyName.toLowerCase().trim()
  return mappings[lower] || normalizeToGroup(lower)
}

// --- CONSTANTS FOR UI ---

export const MUSCLE_GROUP_IDS = MUSCLE_TAXONOMY.map(g => g.id)
export const MUSCLE_GROUP_LABELS = MUSCLE_TAXONOMY.map(g => ({ id: g.id, label: g.label }))
