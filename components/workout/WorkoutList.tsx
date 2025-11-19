import { Search } from 'lucide-react';
import { WorkoutListItem } from '@/types/workout';
import WorkoutCard from './WorkoutCard';

interface WorkoutListProps {
  workouts: WorkoutListItem[];
  filteredWorkouts: WorkoutListItem[];
  searchTerm: string;
  hasActiveFilters: boolean;
  onDeleteWorkout: (id: string) => void;
}

export default function WorkoutList({
  workouts,
  filteredWorkouts,
  searchTerm,
  hasActiveFilters,
  onDeleteWorkout
}: WorkoutListProps) {
  if (workouts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="h-16 w-16 rounded-full bg-white/5 flex items-center justify-center mb-3">
          <Search className="h-8 w-8 text-white/40" strokeWidth={1.5} />
        </div>
        <h3 className="text-base font-light text-white/90 mb-1">No workouts yet</h3>
        <p className="text-sm text-white/60 max-w-xs mb-4 font-light">
          Start your fitness journey by creating or generating your first workout
        </p>
        <div className="flex gap-2">
          <a
            href="/protected/workouts/create"
            className="flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-light text-white/90 hover:bg-white/20 transition-colors"
          >
            <span>+</span>
            Create Workout
          </a>
          <a
            href="/protected/workouts/generate"
            className="flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-light text-white/90 hover:bg-white/20 transition-colors"
          >
            <span>✨</span>
            Generate Workout
          </a>
        </div>
      </div>
    );
  }

  if (filteredWorkouts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-transparent bg-white/5 p-8 text-center">
        <Search className="mb-2 h-6 w-6 text-white/40" strokeWidth={1.5} />
        <p className="text-sm font-light text-white/80">No workouts match your filters</p>
        <p className="text-xs text-white/50 mt-1 font-light">Try adjusting your search or filters</p>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-280px)] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent hover:scrollbar-thumb-white/20">
      <div className="space-y-1.5 pb-1">
        {filteredWorkouts.map((workout) => (
          <WorkoutCard
            key={workout.id}
            workout={workout}
            onDelete={onDeleteWorkout}
          />
        ))}
      </div>
    </div>
  );
}
