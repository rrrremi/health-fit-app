import { Search, Dumbbell } from 'lucide-react';
import { WorkoutListItem } from '@/types/workout';
import { WorkoutMetricCard } from './WorkoutMetricCard';

interface WorkoutListProps {
  workouts: WorkoutListItem[];
  filteredWorkouts: WorkoutListItem[];
  searchTerm: string;
  hasActiveFilters: boolean;
  onDeleteWorkout: (id: string) => void;
  onClearFilters?: () => void;
}

export default function WorkoutList({
  workouts,
  filteredWorkouts,
  searchTerm,
  hasActiveFilters,
  onDeleteWorkout,
  onClearFilters
}: WorkoutListProps) {
  // Empty state - no workouts at all
  if (workouts.length === 0) {
    return (
      <div className="rounded-md border border-transparent bg-white/5 p-6 text-center backdrop-blur-2xl">
        <Dumbbell className="h-10 w-10 mx-auto text-white/30 mb-2" />
        <h3 className="text-base font-medium text-white mb-1.5">No workouts yet</h3>
        <p className="text-xs text-white/60 mb-3">
          Start your fitness journey by creating or generating your first workout
        </p>
        <div className="flex justify-center gap-2">
          <a
            href="/protected/workouts/create"
            className="flex items-center gap-1 rounded-lg border border-transparent bg-white/5 px-3 py-1.5 text-xs text-white/80 backdrop-blur-xl hover:bg-white/10 transition-colors"
          >
            + Create
          </a>
          <a
            href="/protected/workouts/generate"
            className="flex items-center gap-1 rounded-lg border border-transparent bg-white/5 px-3 py-1.5 text-xs text-white/80 backdrop-blur-xl hover:bg-white/10 transition-colors"
          >
            ✨ Generate
          </a>
        </div>
      </div>
    );
  }

  // No results after filtering
  if (filteredWorkouts.length === 0) {
    return (
      <div className="rounded-md border border-transparent bg-white/5 p-6 text-center backdrop-blur-2xl">
        <Search className="h-10 w-10 mx-auto text-white/30 mb-2" />
        <h3 className="text-base font-medium text-white mb-1.5">No workouts found</h3>
        <p className="text-xs text-white/60 mb-3">
          Try adjusting your search or filters
        </p>
        {hasActiveFilters && onClearFilters && (
          <button
            onClick={onClearFilters}
            className="text-[11px] text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            Clear all filters
          </button>
        )}
      </div>
    );
  }

  // Grid of workout cards (matching measurements style)
  return (
    <div className="grid gap-2">
      {filteredWorkouts.map((workout) => (
        <WorkoutMetricCard
          key={workout.id}
          workout={workout}
          onDelete={onDeleteWorkout}
        />
      ))}
    </div>
  );
}
