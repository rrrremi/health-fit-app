import Link from 'next/link';
import { Plus, Sparkles } from 'lucide-react';

export default function WorkoutHeader() {
  return (
    <div className="relative overflow-hidden rounded-lg border border-transparent bg-white/5 p-3 backdrop-blur-2xl">
      <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-white/10 blur-2xl opacity-50" />
      <div className="absolute -bottom-12 -left-12 h-32 w-32 rounded-full bg-white/10 blur-2xl opacity-50" />

      <div className="relative">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Your Workouts
            </h1>
            <p className="mt-0.5 text-xs text-white/70">
              View and manage your workout history
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

interface WorkoutActionsProps {
  className?: string;
}

export function WorkoutActions({ className = "mb-2 flex items-center justify-between relative z-10" }: WorkoutActionsProps) {
  return (
    <div className={className}>
      <div></div>
      <div className="flex items-center gap-1.5">
        <Link href="/protected/workouts/create">
          <button className="flex items-center gap-1 rounded-lg border border-transparent bg-white/5 px-3 py-1.5 text-xs text-white/80 backdrop-blur-xl hover:bg-white/10 transition-colors">
            <Plus className="h-3.5 w-3.5" />
            Create
          </button>
        </Link>
        <Link href="/protected/workouts/generate">
          <button className="flex items-center gap-1 rounded-lg border border-transparent bg-white/5 px-3 py-1.5 text-xs text-white/80 backdrop-blur-xl hover:bg-white/10 transition-colors">
            <Sparkles className="h-3.5 w-3.5" />
            Generate
          </button>
        </Link>
      </div>
    </div>
  );
}
