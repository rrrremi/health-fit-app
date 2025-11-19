import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Target, Clock, BarChart3, Trash2 } from 'lucide-react';
import { WorkoutListItem } from '@/types/workout';
import WorkoutRatingDisplay from '@/components/workout/WorkoutRatingDisplay';
import { WorkoutStatusBadge } from './WorkoutStatusBadge';
import { parseFocusValues, parseMuscleValues } from '@/lib/workout-utils';

interface WorkoutCardProps {
  workout: WorkoutListItem;
  onDelete: (id: string) => void;
}

export default function WorkoutCard({ workout, onDelete }: WorkoutCardProps) {
  const router = useRouter();

  const focusValues = parseFocusValues(workout.workout_focus);
  const muscleValues = parseMuscleValues(workout.muscle_focus);

  return (
    <div
      onClick={() => router.push(`/protected/workouts/${workout.id}`)}
      className="rounded-lg border border-transparent bg-white/5 backdrop-blur-xl p-1.5 hover:bg-white/10 transition-all duration-200 focus-ring cursor-pointer"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0 overflow-hidden">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-light text-white/90 truncate flex-1">
              {workout.name || `Workout ${new Date(workout.created_at).toLocaleDateString()}`}
            </h3>
            <WorkoutRatingDisplay rating={workout.rating} />
            <div className="flex-shrink-0">
              <WorkoutStatusBadge status={workout.status} targetDate={workout.target_date} />
            </div>
          </div>
          <div className="flex flex-wrap gap-1 mt-0.5 max-w-[200px] overflow-hidden">
            {focusValues.slice(0, 2).map((focus, index) => (
              <span
                key={`${workout.id}-focus-${index}`}
                className="text-[9px] font-medium px-1 py-0 rounded-full bg-cyan-500/20 text-cyan-300 capitalize"
              >
                {focus}
              </span>
            ))}
            {muscleValues.slice(0, 2).map((muscle, index) => (
              <span
                key={`${workout.id}-muscle-${index}`}
                className="text-[9px] font-medium px-1 py-0 rounded-full bg-fuchsia-500/20 text-fuchsia-200 capitalize"
              >
                {muscle}
              </span>
            ))}
          </div>
        </div>

        <div className="flex-shrink-0 flex items-center gap-2 text-[9px] text-white/50">
          <div className="flex items-center gap-0.5">
            <Target className="h-2 w-2" />
            <span>{workout.workout_data.exercises.length}</span>
          </div>
          <div className="flex items-center gap-0.5">
            <Clock className="h-2 w-2" />
            <span>{workout.total_duration_minutes}m</span>
          </div>
          <div className="hidden sm:flex items-center gap-0.5">
            <BarChart3 className="h-2 w-2" />
            <span className="truncate max-w-[80px]">
              {muscleValues.slice(0, 2).join(', ')}
            </span>
          </div>
        </div>

        <div className="flex-shrink-0 flex items-center">
          <button
            onClick={(event) => {
              event.stopPropagation();
              onDelete(workout.id);
            }}
            className="p-1.5 rounded-md hover:bg-red-500/10 text-white/50 hover:text-red-400 transition-colors"
            aria-label="Delete workout"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
