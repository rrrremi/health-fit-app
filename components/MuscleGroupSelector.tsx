import React, { useState, useEffect } from 'react';
import { muscleGroups, Muscle, MuscleSubGroup, getAllMuscles, mapToSimplifiedCategories } from '@/lib/data/muscleGroups';

interface MuscleGroupSelectorProps {
  onSelectionChange?: (selection: any) => void;
  onSimplifiedSelectionChange?: (simplifiedCategories: string[]) => void;
  initialSelection?: Set<string>;
  maxSelections?: number;
}

/**
 * Enhanced Muscle Group Selector Component
 * 
 * Allows users to select specific muscles within muscle groups and subgroups
 * for more targeted workout generation.
 */
const MuscleGroupSelector: React.FC<MuscleGroupSelectorProps> = ({
  onSelectionChange,
  onSimplifiedSelectionChange,
  initialSelection = new Set<string>(),
  maxSelections = 8
}) => {
  const [selectedMuscles, setSelectedMuscles] = useState<Set<string>>(initialSelection);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [expandedSubGroups, setExpandedSubGroups] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  
  // Update parent component when selection changes
  useEffect(() => {
    if (onSelectionChange) {
      onSelectionChange(formatSelection(selectedMuscles));
    }
    
    if (onSimplifiedSelectionChange) {
      const simplifiedCategories = mapToSimplifiedCategories(Array.from(selectedMuscles));
      onSimplifiedSelectionChange(simplifiedCategories);
    }
  }, [selectedMuscles, onSelectionChange, onSimplifiedSelectionChange]);
  
  const toggleMuscle = (muscleId: string) => {
    const newSelection = new Set(selectedMuscles);
    
    if (newSelection.has(muscleId)) {
      newSelection.delete(muscleId);
    } else {
      // Check if we've reached the maximum number of selections
      if (newSelection.size >= maxSelections) {
        alert(`You can only select up to ${maxSelections} muscles at once.`);
        return;
      }
      newSelection.add(muscleId);
    }
    
    setSelectedMuscles(newSelection);
  };
  
  const toggleGroup = (groupId: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
  };
  
  const toggleSubGroup = (subGroupId: string) => {
    const newExpanded = new Set(expandedSubGroups);
    if (newExpanded.has(subGroupId)) {
      newExpanded.delete(subGroupId);
    } else {
      newExpanded.add(subGroupId);
    }
    setExpandedSubGroups(newExpanded);
  };
  
  const selectAllInSubGroup = (groupId: string, subGroupId: string) => {
    const subGroup = muscleGroups[groupId]?.subGroups[subGroupId];
    if (!subGroup) return;
    
    const typedSubGroup = subGroup as MuscleSubGroup;
    const newSelection = new Set(selectedMuscles);
    const muscleIds = typedSubGroup.muscles.map((m: Muscle) => m.id);
    
    // Check if adding these would exceed the limit
    const newMuscles = muscleIds.filter(id => !newSelection.has(id));
    if (newSelection.size + newMuscles.length > maxSelections) {
      setError(`You can only select up to ${maxSelections} muscles at once.`);
      return;
    }
    
    muscleIds.forEach(id => newSelection.add(id));
    setSelectedMuscles(newSelection);
  };
  

  
  const clearSelection = () => {
    setSelectedMuscles(new Set());
    if (onSelectionChange) {
      onSelectionChange({});
    }
    if (onSimplifiedSelectionChange) {
      onSimplifiedSelectionChange([]);
    }
  };
  
  const formatSelection = (selectedSet: Set<string>) => {
    const result: Record<string, any> = {};
    
    Object.entries(muscleGroups).forEach(([groupId, group]) => {
      Object.entries(group.subGroups).forEach(([subGroupId, subGroup]) => {
        const typedSubGroup = subGroup as MuscleSubGroup;
        const selectedInSubGroup = typedSubGroup.muscles.filter((muscle: Muscle) => 
          selectedSet.has(muscle.id)
        );
        
        if (selectedInSubGroup.length > 0) {
          if (!result[groupId]) {
            result[groupId] = {
              label: group.label,
              subGroups: {}
            };
          }
          result[groupId].subGroups[subGroupId] = {
            label: typedSubGroup.label,
            muscles: selectedInSubGroup
          };
        }
      });
    });
    
    return result;
  };
  
  const formatForPrompt = () => {
    const selection = formatSelection(selectedMuscles);
    return Object.entries(selection).map(([groupId, group]) => {
      const subGroupsText = Object.entries(group.subGroups).map(([subGroupId, subGroup]) => {
        const typedSubGroup = subGroup as { label: string, muscles: Muscle[] };
        const muscleNames = typedSubGroup.muscles.map((m: Muscle) => m.name).join(', ');
        return `${typedSubGroup.label} (${muscleNames})`;
      }).join('; ');
      
      return `${group.label}: ${subGroupsText}`;
    }).join(' | ');
  };
  
  const getSelectedCount = (groupId?: string, subGroupId?: string) => {
    if (!groupId && !subGroupId) {
      return selectedMuscles.size;
    }
    
    if (groupId && !subGroupId) {
      // Count muscles in this group
      let count = 0;
      const group = muscleGroups[groupId];
      if (group) {
        Object.values(group.subGroups).forEach((subGroup) => {
          const typedSubGroup = subGroup as MuscleSubGroup;
          typedSubGroup.muscles.forEach((muscle: Muscle) => {
            if (selectedMuscles.has(muscle.id)) count++;
          });
        });
      }
      return count;
    }
    
    if (groupId && subGroupId) {
      // Count muscles in this subgroup
      let count = 0;
      const subGroup = muscleGroups[groupId]?.subGroups[subGroupId];
      if (subGroup) {
        const typedSubGroup = subGroup as MuscleSubGroup;
        typedSubGroup.muscles.forEach((muscle: Muscle) => {
          if (selectedMuscles.has(muscle.id)) count++;
        });
      }
      return count;
    }
    
    return 0;
  };
  
  return (
    <div className="muscle-group-selector">
      {error && (
        <div className="bg-destructive/10 border-l-4 border-destructive text-destructive p-2 rounded mb-3 text-sm">
          <span>{error}</span>
          <button 
            onClick={() => setError(null)} 
            className="ml-2 text-destructive hover:text-destructive/80"
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
      )}
      <div className="selection-header">
        <h3>Muscle Selection ({getSelectedCount()}/{maxSelections})</h3>
        {getSelectedCount() > 0 && (
          <button 
            onClick={clearSelection}
            className="clear-button"
          >
            Clear All
          </button>
        )}
      </div>
      
      <div className="muscle-groups">
        {Object.entries(muscleGroups).map(([groupId, group]) => (
          <div key={groupId} className="muscle-group">
            <div 
              className="group-header"
              onClick={() => toggleGroup(groupId)}
            >
              <h4>{group.label}</h4>
              <span className="selection-count">
                {getSelectedCount(groupId) > 0 && `${getSelectedCount(groupId)} selected`}
              </span>
              <span className="expand-icon">
                {expandedGroups.has(groupId) ? '▼' : '►'}
              </span>
            </div>
            
            {expandedGroups.has(groupId) && (
              <div className="sub-groups">
                {Object.entries(group.subGroups).map(([subGroupId, subGroup]) => (
                  <div key={`${groupId}-${subGroupId}`} className="sub-group">
                    <div 
                      className="sub-group-header"
                      onClick={() => toggleSubGroup(`${groupId}-${subGroupId}`)}
                    >
                      <h5>{subGroup.label}</h5>
                      <span className="selection-count">
                        {getSelectedCount(groupId, subGroupId) > 0 && 
                          `${getSelectedCount(groupId, subGroupId)}/${subGroup.muscles.length}`
                        }
                      </span>
                      <button
                        className="select-all-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          selectAllInSubGroup(groupId, subGroupId);
                        }}
                      >
                        Select All
                      </button>
                      <span className="expand-icon">
                        {expandedSubGroups.has(`${groupId}-${subGroupId}`) ? '▼' : '►'}
                      </span>
                    </div>
                    
                    {expandedSubGroups.has(`${groupId}-${subGroupId}`) && (
                      <div className="muscles">
                        {subGroup.muscles.map(muscle => (
                          <div 
                            key={muscle.id} 
                            className={`muscle ${selectedMuscles.has(muscle.id) ? 'selected' : ''}`}
                            onClick={() => toggleMuscle(muscle.id)}
                          >
                            <span className="muscle-name">{muscle.name}</span>
                            {selectedMuscles.has(muscle.id) && (
                              <span className="checkmark">✓</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      
      {selectedMuscles.size > 0 && (
        <div className="selection-summary">
          <h4>Selected Muscles:</h4>
          <p>{formatForPrompt()}</p>
        </div>
      )}
      
      <style jsx>{`
        .muscle-group-selector {
          font-family: system-ui, -apple-system, sans-serif;
          max-width: 800px;
          margin: 0 auto;
        }
        
        .selection-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }
        
        .clear-button {
          background: #f44336;
          color: white;
          border: none;
          padding: 0.25rem 0.75rem;
          border-radius: 4px;
          cursor: pointer;
        }
        
        .muscle-groups {
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          overflow: hidden;
        }
        
        .muscle-group {
          border-bottom: 1px solid #e0e0e0;
        }
        
        .muscle-group:last-child {
          border-bottom: none;
        }
        
        .group-header, .sub-group-header {
          display: flex;
          align-items: center;
          padding: 0.75rem 1rem;
          cursor: pointer;
          background: #f5f5f5;
        }
        
        .group-header:hover, .sub-group-header:hover {
          background: #eeeeee;
        }
        
        .group-header h4, .sub-group-header h5 {
          margin: 0;
          flex: 1;
        }
        
        .selection-count {
          margin-right: 1rem;
          font-size: 0.85rem;
          color: #666;
        }
        
        .expand-icon {
          font-size: 0.75rem;
        }
        
        .sub-groups {
          padding-left: 1rem;
        }
        
        .sub-group {
          border-top: 1px solid #f0f0f0;
        }
        
        .select-all-button {
          background: #2196f3;
          color: white;
          border: none;
          padding: 0.15rem 0.5rem;
          border-radius: 4px;
          margin-right: 0.75rem;
          font-size: 0.75rem;
          cursor: pointer;
        }
        
        .muscles {
          padding: 0.5rem 1rem 0.5rem 2rem;
        }
        
        .muscle {
          display: flex;
          align-items: center;
          padding: 0.5rem;
          cursor: pointer;
          border-radius: 4px;
        }
        
        .muscle:hover {
          background: #f0f0f0;
        }
        
        .muscle.selected {
          background: #e3f2fd;
        }
        
        .muscle-name {
          flex: 1;
        }
        
        .checkmark {
          color: #2196f3;
          font-weight: bold;
        }
        
        .selection-summary {
          margin-top: 1.5rem;
          padding: 1rem;
          background: #f5f5f5;
          border-radius: 8px;
        }
        
        .selection-summary h4 {
          margin-top: 0;
        }
      `}</style>
    </div>
  );
};

export default MuscleGroupSelector;
