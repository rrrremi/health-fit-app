'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, ChevronDown } from 'lucide-react'
import { 
  MUSCLE_TAXONOMY, 
  MuscleSelection, 
  MuscleGroup,
  getGroupById 
} from '@/lib/muscles/taxonomy'

interface MuscleGroupPickerProps {
  selections: MuscleSelection[]
  onChange: (selections: MuscleSelection[]) => void
  compact?: boolean  // For filter bars
  className?: string
}

/**
 * Muscle Group Picker
 * 
 * - Tap: Toggle whole muscle group
 * - Long-press (or second tap): Open sub-muscle selector
 * - Shows badge when specific sub-muscles are selected
 */
export default function MuscleGroupPicker({ 
  selections, 
  onChange, 
  compact = false,
  className = '' 
}: MuscleGroupPickerProps) {
  const [openPopup, setOpenPopup] = useState<string | null>(null)
  const longPressTimer = useRef<NodeJS.Timeout | null>(null)
  const isLongPress = useRef(false)
  const popupRef = useRef<HTMLDivElement>(null)

  // Close popup when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        setOpenPopup(null)
      }
    }
    if (openPopup) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [openPopup])

  // Check if a group is selected (fully or partially)
  const isGroupSelected = useCallback((groupId: string): boolean => {
    return selections.some(s => s.groupId === groupId)
  }, [selections])

  // Get selected sub-muscles for a group
  const getSelectedSubMuscles = useCallback((groupId: string): string[] | null => {
    const sel = selections.find(s => s.groupId === groupId)
    return sel?.specific || null
  }, [selections])

  // Get count of selected sub-muscles (null = all)
  const getSelectedCount = useCallback((groupId: string): number | null => {
    const sel = selections.find(s => s.groupId === groupId)
    if (!sel) return 0
    if (!sel.specific) return null // whole group
    return sel.specific.length
  }, [selections])

  // Toggle whole group
  const toggleGroup = useCallback((groupId: string) => {
    const existing = selections.find(s => s.groupId === groupId)
    
    if (existing) {
      // Remove group
      onChange(selections.filter(s => s.groupId !== groupId))
    } else {
      // Add whole group
      onChange([...selections, { groupId, specific: null }])
    }
  }, [selections, onChange])

  // Toggle specific sub-muscle
  const toggleSubMuscle = useCallback((groupId: string, subMuscleId: string) => {
    const group = getGroupById(groupId)
    if (!group) return

    const existing = selections.find(s => s.groupId === groupId)
    
    if (!existing) {
      // Add group with just this sub-muscle
      onChange([...selections, { groupId, specific: [subMuscleId] }])
      return
    }

    let newSpecific: string[] | null

    if (existing.specific === null) {
      // Was whole group, now deselect one sub-muscle
      newSpecific = group.subMuscles
        .filter(sm => sm.id !== subMuscleId)
        .map(sm => sm.id)
    } else if (existing.specific.includes(subMuscleId)) {
      // Remove sub-muscle
      newSpecific = existing.specific.filter(id => id !== subMuscleId)
    } else {
      // Add sub-muscle
      newSpecific = [...existing.specific, subMuscleId]
    }

    // If no sub-muscles left, remove group
    if (newSpecific.length === 0) {
      onChange(selections.filter(s => s.groupId !== groupId))
      return
    }

    // If all sub-muscles selected, convert to whole group
    if (newSpecific.length === group.subMuscles.length) {
      newSpecific = null
    }

    onChange(selections.map(s => 
      s.groupId === groupId ? { ...s, specific: newSpecific } : s
    ))
  }, [selections, onChange])

  // Select all sub-muscles in a group
  const selectAllInGroup = useCallback((groupId: string) => {
    const existing = selections.find(s => s.groupId === groupId)
    
    if (existing) {
      onChange(selections.map(s => 
        s.groupId === groupId ? { ...s, specific: null } : s
      ))
    } else {
      onChange([...selections, { groupId, specific: null }])
    }
  }, [selections, onChange])

  // Deselect all in a group
  const deselectAllInGroup = useCallback((groupId: string) => {
    onChange(selections.filter(s => s.groupId !== groupId))
  }, [selections, onChange])

  // Handle touch/mouse events for long-press
  const handlePressStart = useCallback((groupId: string) => {
    isLongPress.current = false
    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true
      setOpenPopup(groupId)
    }, 500) // 500ms for long press
  }, [])

  const handlePressEnd = useCallback((groupId: string) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
    
    if (!isLongPress.current) {
      // Was a short tap
      if (openPopup === groupId) {
        // Popup is open, close it
        setOpenPopup(null)
      } else if (isGroupSelected(groupId)) {
        // Already selected, open popup to modify
        setOpenPopup(groupId)
      } else {
        // Not selected, toggle whole group
        toggleGroup(groupId)
      }
    }
    isLongPress.current = false
  }, [openPopup, isGroupSelected, toggleGroup])

  const handlePressCancel = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
    isLongPress.current = false
  }, [])

  return (
    <div className={`relative ${className}`}>
      {/* Group Buttons */}
      <div className={`flex flex-wrap gap-1.5 ${compact ? '' : 'gap-2'}`}>
        {MUSCLE_TAXONOMY.map((group) => {
          const selected = isGroupSelected(group.id)
          const count = getSelectedCount(group.id)
          const isOpen = openPopup === group.id
          
          return (
            <div key={group.id} className="relative">
              <button
                onMouseDown={() => handlePressStart(group.id)}
                onMouseUp={() => handlePressEnd(group.id)}
                onMouseLeave={handlePressCancel}
                onTouchStart={() => handlePressStart(group.id)}
                onTouchEnd={() => handlePressEnd(group.id)}
                onTouchCancel={handlePressCancel}
                className={`
                  relative flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-light 
                  transition-all select-none touch-manipulation
                  ${compact ? 'px-2 py-1 text-[10px]' : ''}
                  ${selected
                    ? 'border-white/40 bg-white/20 text-white'
                    : 'border-white/20 bg-white/5 text-white/60 hover:bg-white/10 hover:border-white/30'
                  }
                  ${isOpen ? 'ring-1 ring-white/30' : ''}
                `}
              >
                {selected && (
                  <Check className={`${compact ? 'h-2.5 w-2.5' : 'h-3 w-3'} text-white/80`} strokeWidth={2} />
                )}
                <span>{group.label}</span>
                {count !== null && count > 0 && count < (getGroupById(group.id)?.subMuscles.length || 0) && (
                  <span className="ml-0.5 text-[9px] text-white/50">({count})</span>
                )}
                {selected && (
                  <ChevronDown className={`${compact ? 'h-2.5 w-2.5' : 'h-3 w-3'} text-white/40`} strokeWidth={1.5} />
                )}
              </button>

              {/* Sub-muscle Popup */}
              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    ref={popupRef}
                    initial={{ opacity: 0, y: -5, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -5, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full left-0 mt-1.5 z-50 min-w-[180px] rounded-lg border border-white/20 bg-slate-900/95 backdrop-blur-xl shadow-xl"
                  >
                    <SubMuscleSelector
                      group={group}
                      selectedSubMuscles={getSelectedSubMuscles(group.id)}
                      onToggle={(subId) => toggleSubMuscle(group.id, subId)}
                      onSelectAll={() => selectAllInGroup(group.id)}
                      onDeselectAll={() => deselectAllInGroup(group.id)}
                      onClose={() => setOpenPopup(null)}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>

      {/* Hint text */}
      {!compact && selections.length === 0 && (
        <p className="mt-2 text-[10px] text-white/40">
          Tap to select • Hold to choose specific parts
        </p>
      )}
    </div>
  )
}

// --- Sub-muscle Selector Popup ---

interface SubMuscleSelectorProps {
  group: MuscleGroup
  selectedSubMuscles: string[] | null  // null = all selected
  onToggle: (subMuscleId: string) => void
  onSelectAll: () => void
  onDeselectAll: () => void
  onClose: () => void
}

function SubMuscleSelector({ 
  group, 
  selectedSubMuscles, 
  onToggle, 
  onSelectAll, 
  onDeselectAll,
  onClose 
}: SubMuscleSelectorProps) {
  const allSelected = selectedSubMuscles === null
  const noneSelected = selectedSubMuscles !== null && selectedSubMuscles.length === 0

  const isSubMuscleSelected = (subId: string): boolean => {
    if (selectedSubMuscles === null) return true
    return selectedSubMuscles.includes(subId)
  }

  return (
    <div className="p-2">
      {/* Header */}
      <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-white/10">
        <span className="text-xs font-medium text-white/90">{group.label}</span>
        <div className="flex gap-1">
          <button
            onClick={onSelectAll}
            className={`px-1.5 py-0.5 text-[9px] rounded ${allSelected ? 'bg-white/20 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}
          >
            All
          </button>
          <button
            onClick={onDeselectAll}
            className={`px-1.5 py-0.5 text-[9px] rounded ${noneSelected ? 'bg-white/20 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}
          >
            None
          </button>
        </div>
      </div>

      {/* Sub-muscles */}
      <div className="space-y-0.5">
        {group.subMuscles.map((sub) => {
          const selected = isSubMuscleSelected(sub.id)
          return (
            <button
              key={sub.id}
              onClick={() => onToggle(sub.id)}
              className={`
                w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-xs transition-colors
                ${selected 
                  ? 'bg-white/15 text-white' 
                  : 'text-white/60 hover:bg-white/5 hover:text-white/80'
                }
              `}
            >
              <div className={`
                h-3.5 w-3.5 rounded border flex items-center justify-center flex-shrink-0
                ${selected ? 'border-white/50 bg-white/20' : 'border-white/30'}
              `}>
                {selected && <Check className="h-2.5 w-2.5 text-white" strokeWidth={2.5} />}
              </div>
              <span>{sub.label}</span>
            </button>
          )
        })}
      </div>

      {/* Done button */}
      <button
        onClick={onClose}
        className="w-full mt-2 py-1.5 text-xs font-medium text-white/80 bg-white/10 hover:bg-white/15 rounded transition-colors"
      >
        Done
      </button>
    </div>
  )
}

// --- Compact Filter Version ---

interface MuscleFilterChipsProps {
  selected: string[]  // Just group IDs for simple filtering
  onChange: (selected: string[]) => void
  className?: string
}

export function MuscleFilterChips({ selected, onChange, className = '' }: MuscleFilterChipsProps) {
  const toggle = (groupId: string) => {
    if (selected.includes(groupId)) {
      onChange(selected.filter(id => id !== groupId))
    } else {
      onChange([...selected, groupId])
    }
  }

  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      <button
        onClick={() => onChange([])}
        className={`
          px-2.5 py-1 rounded-full text-[10px] font-light whitespace-nowrap transition-all border
          ${selected.length === 0
            ? 'border-white/30 bg-white/20 text-white/90'
            : 'border-white/15 bg-white/5 text-white/60 hover:bg-white/10 hover:border-white/20'
          }
        `}
      >
        All
      </button>
      {MUSCLE_TAXONOMY.map((group) => (
        <button
          key={group.id}
          onClick={() => toggle(group.id)}
          className={`
            px-2.5 py-1 rounded-full text-[10px] font-light whitespace-nowrap transition-all border
            ${selected.includes(group.id)
              ? 'border-white/30 bg-white/20 text-white/90'
              : 'border-white/15 bg-white/5 text-white/60 hover:bg-white/10 hover:border-white/20'
            }
          `}
        >
          {group.label}
        </button>
      ))}
    </div>
  )
}
