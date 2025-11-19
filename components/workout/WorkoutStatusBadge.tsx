import { WorkoutListItem } from '@/types/workout';

interface WorkoutStatusBadgeProps {
  status: WorkoutListItem['status'];
  targetDate: string | null;
}

const labelMap: Record<string, string> = {
  new: 'New',
  target: 'Target',
  missed: 'Missed',
  completed: 'Completed'
};

const colorMap: Record<string, string> = {
  new: 'bg-white/10 text-white/80 border-transparent',
  target: 'bg-cyan-500/20 text-cyan-200 border-cyan-500/30',
  missed: 'bg-amber-500/20 text-amber-200 border-amber-500/30',
  completed: 'bg-emerald-500/20 text-emerald-200 border-emerald-500/30'
};

export function WorkoutStatusBadge({ status, targetDate }: WorkoutStatusBadgeProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const effectiveStatus = status || (targetDate ? (new Date(targetDate).getTime() >= today.getTime() ? 'target' : 'missed') : 'new');

  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full border inline-flex items-center justify-center ${colorMap[effectiveStatus] || 'bg-white/10 text-white/70 border-transparent'}`}>
      {labelMap[effectiveStatus] || 'New'}
    </span>
  );
}
