import { useState, useMemo } from 'react';
import { WorkoutListItem, SortField, SortDirection, ParsedWorkoutData } from '@/types/workout';
import { parseWorkoutData } from '@/lib/workout-utils';

interface UseWorkoutFiltersReturn {
  // Filter state
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  showFilters: boolean;
  setShowFilters: (show: boolean) => void;
  selectedMuscles: string[];
  selectedFocus: string[];
  selectedStatuses: string[];
  sortField: SortField;
  sortDirection: SortDirection;

  // Filter actions
  toggleMuscleFilter: (muscleId: string) => void;
  toggleFocusFilter: (focusId: string) => void;
  toggleStatusFilter: (statusId: string) => void;
  clearFilters: () => void;
  handleSortChange: (field: SortField) => void;

  // Computed values
  parsedWorkoutData: ParsedWorkoutData[];
  filteredWorkouts: WorkoutListItem[];
  hasActiveFilters: boolean;
}

export function useWorkoutFilters(workouts: WorkoutListItem[]): UseWorkoutFiltersReturn {
  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedMuscles, setSelectedMuscles] = useState<string[]>([]);
  const [selectedFocus, setSelectedFocus] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [sortField, setSortField] = useState<SortField>('target_date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Performance: Memoize parsed values to avoid repeated parsing
  const parsedWorkoutData = useMemo(() => parseWorkoutData(workouts), [workouts]);

  // Filter workouts based on search term and selected filters
  const filteredWorkouts = useMemo(() => {
    const filtered = workouts.filter((workout, index) => {
      // Filter by search term
      const name = workout.name || `Workout ${new Date(workout.created_at).toLocaleDateString()}`;
      const matchesSearch = !searchTerm || name.toLowerCase().includes(searchTerm.toLowerCase());

      // Use pre-parsed data for performance
      const parsed = parsedWorkoutData[index];
      if (!parsed) return false;

      // Filter by selected muscles
      const matchesMuscles = selectedMuscles.length === 0 ||
        selectedMuscles.some(selected => parsed.muscles.includes(selected.toLowerCase()));

      // Filter by selected focus
      const matchesFocus = selectedFocus.length === 0 ||
        selectedFocus.some(selected => parsed.focus.includes(selected.toLowerCase()));

      const matchesStatus = selectedStatuses.length === 0 || (workout.status ? selectedStatuses.includes(workout.status) : selectedStatuses.includes('new'));
      return matchesSearch && matchesMuscles && matchesFocus && matchesStatus;
    });

    return filtered.sort((a, b) => {
      const directionMultiplier = sortDirection === 'asc' ? 1 : -1;
      const compareCreated = () => {
        const createdA = new Date(a.created_at).getTime();
        const createdB = new Date(b.created_at).getTime();
        if (createdA === createdB) {
          const nameA = (a.name || '').toLowerCase();
          const nameB = (b.name || '').toLowerCase();
          return nameA.localeCompare(nameB) * directionMultiplier;
        }
        return (createdA - createdB) * directionMultiplier;
      };

      if (sortField === 'name') {
        const nameA = (a.name || '').toLowerCase();
        const nameB = (b.name || '').toLowerCase();
        if (nameA === nameB) return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        return nameA.localeCompare(nameB) * directionMultiplier;
      }

      if (sortField === 'target_date') {
        const dateA = a.target_date ? new Date(a.target_date).getTime() : null;
        const dateB = b.target_date ? new Date(b.target_date).getTime() : null;

        if (dateA === null && dateB === null) {
          return compareCreated();
        }

        if (dateA === null) return 1;
        if (dateB === null) return -1;

        if (dateA === dateB) {
          return compareCreated();
        }

        return (dateA - dateB) * directionMultiplier;
      }

      // sortField === 'created_at'
      return compareCreated();
    });
  }, [workouts, parsedWorkoutData, searchTerm, selectedMuscles, selectedFocus, selectedStatuses, sortField, sortDirection]);

  const toggleMuscleFilter = (muscleId: string) => {
    setSelectedMuscles(prev =>
      prev.includes(muscleId)
        ? prev.filter(id => id !== muscleId)
        : [...prev, muscleId]
    );
  };

  const toggleFocusFilter = (focusId: string) => {
    setSelectedFocus(prev =>
      prev.includes(focusId)
        ? prev.filter(id => id !== focusId)
        : [...prev, focusId]
    );
  };

  const toggleStatusFilter = (statusId: string) => {
    setSelectedStatuses(prev =>
      prev.includes(statusId)
        ? prev.filter(id => id !== statusId)
        : [...prev, statusId]
    );
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedMuscles([]);
    setSelectedFocus([]);
    setSelectedStatuses([]);
  };

  const handleSortChange = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortField(field);
    setSortDirection(field === 'name' ? 'asc' : 'desc');
  };

  const hasActiveFilters = !!(searchTerm || selectedMuscles.length > 0 || selectedFocus.length > 0 || selectedStatuses.length > 0);

  return {
    searchTerm,
    setSearchTerm,
    showFilters,
    setShowFilters,
    selectedMuscles,
    selectedFocus,
    selectedStatuses,
    sortField,
    sortDirection,
    toggleMuscleFilter,
    toggleFocusFilter,
    toggleStatusFilter,
    clearFilters,
    handleSortChange,
    parsedWorkoutData,
    filteredWorkouts,
    hasActiveFilters
  };
}
