import { Search, Filter, ChevronDown, ChevronUp, X, ArrowUpDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { SortField, MUSCLE_OPTIONS, FOCUS_OPTIONS, STATUS_OPTIONS } from '@/types/workout';

interface WorkoutFiltersProps {
  // Search
  searchTerm: string;
  onSearchChange: (term: string) => void;

  // Filter visibility
  showFilters: boolean;
  onToggleFilters: () => void;

  // Active filters indicator
  hasActiveFilters: boolean;
  onClearFilters: () => void;

  // Sort controls
  sortField: SortField;
  sortDirection: 'asc' | 'desc';
  onSortChange: (field: SortField) => void;

  // Muscle filters
  selectedMuscles: string[];
  onToggleMuscle: (muscleId: string) => void;

  // Focus filters
  selectedFocus: string[];
  onToggleFocus: (focusId: string) => void;

  // Status filters
  selectedStatuses: string[];
  onToggleStatus: (statusId: string) => void;
}

export default function WorkoutFilters({
  searchTerm,
  onSearchChange,
  showFilters,
  onToggleFilters,
  hasActiveFilters,
  onClearFilters,
  sortField,
  sortDirection,
  onSortChange,
  selectedMuscles,
  onToggleMuscle,
  selectedFocus,
  onToggleFocus,
  selectedStatuses,
  onToggleStatus
}: WorkoutFiltersProps) {
  return (
    <div className="p-2 border-b border-transparent">
      <div className="flex items-center justify-between">
        {/* Search and Filter Controls */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search"
              className="w-28 rounded-md border border-white/20 bg-white/10 py-1 pl-6 pr-2 text-xs font-light text-white/90 placeholder-white/40 focus:border-white/40 focus:outline-none backdrop-blur-xl"
            />
          </div>
          {hasActiveFilters && (
            <button
              onClick={onClearFilters}
              className="flex items-center gap-1 rounded-md border border-white/20 bg-white/10 px-2 py-1 text-xs font-light text-white/80 hover:bg-white/20 transition-colors"
            >
              <X className="h-3 w-3" strokeWidth={1.5} />
            </button>
          )}
          <button
            onClick={onToggleFilters}
            className="flex items-center gap-1 rounded-md border border-white/20 bg-white/10 px-2 py-1 text-xs font-light text-white/80 hover:bg-white/20 transition-colors"
          >
            <Filter className="h-3 w-3" strokeWidth={1.5} />
            <span className="hidden sm:inline">Filter</span>
            {showFilters ? (
              <ChevronUp className="h-3 w-3" strokeWidth={1.5} />
            ) : (
              <ChevronDown className="h-3 w-3" strokeWidth={1.5} />
            )}
          </button>
          <div className="flex items-center gap-1 text-xs text-white/60">
            <span className="font-light">Sort by</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => onSortChange('target_date')}
                className={`flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-light transition-colors ${
                  sortField === 'target_date'
                    ? 'border-white/40 bg-white/20 text-white/90'
                    : 'border-white/20 bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                <ArrowUpDown className="h-3 w-3" strokeWidth={1.5} />
                Target Date
              </button>
              <button
                onClick={() => onSortChange('created_at')}
                className={`flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-light transition-colors ${
                  sortField === 'created_at'
                    ? 'border-white/40 bg-white/20 text-white/90'
                    : 'border-white/20 bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                <ArrowUpDown className="h-3 w-3" strokeWidth={1.5} />
                Created
              </button>
              <button
                onClick={() => onSortChange('name')}
                className={`flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-light transition-colors ${
                  sortField === 'name'
                    ? 'border-white/40 bg-white/20 text-white/90'
                    : 'border-white/20 bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                <ArrowUpDown className="h-3 w-3" strokeWidth={1.5} />
                Name
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="space-y-2 pt-1 mt-2"
        >
          {/* Muscle Focus Filters */}
          {MUSCLE_OPTIONS.length > 0 && (
            <div>
              <div className="mb-1 text-xs text-white/70 font-light">Muscle Focus</div>
              <div className="flex flex-wrap gap-1.5">
                {MUSCLE_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => onToggleMuscle(option.id)}
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-light transition-colors ${
                      selectedMuscles.includes(option.id)
                        ? 'border-white/40 bg-white/20 text-white/90'
                        : 'border-white/20 bg-white/5 text-white/60 hover:bg-white/10'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          {/* Workout Focus Filters */}
          {FOCUS_OPTIONS.length > 0 && (
            <div>
              <div className="mb-1 text-xs text-white/70 font-light">Workout Focus</div>
              <div className="flex flex-wrap gap-1.5">
                {FOCUS_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => onToggleFocus(option.id)}
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-light transition-colors ${
                      selectedFocus.includes(option.id)
                        ? 'border-white/40 bg-white/20 text-white/90'
                        : 'border-white/20 bg-white/5 text-white/60 hover:bg-white/10'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          {/* Status Filters */}
          {STATUS_OPTIONS.length > 0 && (
            <div>
              <div className="mb-1 text-xs text-white/70 font-light">Status</div>
              <div className="flex flex-wrap gap-1.5">
                {STATUS_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => onToggleStatus(option.id)}
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-light transition-colors ${
                      selectedStatuses.includes(option.id)
                        ? 'border-white/40 bg-white/20 text-white/90'
                        : 'border-white/20 bg-white/5 text-white/60 hover:bg-white/10'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
