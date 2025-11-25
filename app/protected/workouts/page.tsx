'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { AlertCircle, Dumbbell, Plus, Sparkles, Search, Filter, ChevronDown, ChevronUp, X, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { WorkoutListItem, MUSCLE_OPTIONS, FOCUS_OPTIONS, STATUS_OPTIONS, SortField } from '@/types/workout'
import { useWorkoutsData } from '@/hooks/useWorkoutsData'
import { useWorkoutFilters } from '@/hooks/useWorkoutFilters'
import { useWorkoutModal } from '@/hooks/useWorkoutModal'
import DeleteWorkoutModal from '@/components/workout/DeleteWorkoutModal'
import WorkoutList from '@/components/workout/WorkoutList'

export default function WorkoutsPage() {
  // Cache reference for performance
  const workoutsCacheRef = useRef<{ workouts: WorkoutListItem[]; timestamp: number } | null>(null)

  // Custom hooks for data and state management
  const { user, isAdmin, loading, error, workouts, fetchWorkouts } = useWorkoutsData()

  const {
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
    filteredWorkouts,
    hasActiveFilters
  } = useWorkoutFilters(workouts)

  const { deleteTargetId, isDeleteModalOpen, isDeleting, openDeleteModal, closeDeleteModal, handleDeleteConfirm } = useWorkoutModal()

  // Enhanced delete handler with cache update
  const handleDeleteWorkout = async (id: string) => {
    await handleDeleteConfirm(
      workouts,
      (updatedWorkouts) => {
        fetchWorkouts(user?.id || '', true)
      },
      (updatedWorkouts) => {
        if (workoutsCacheRef.current) {
          workoutsCacheRef.current = {
            workouts: updatedWorkouts,
            timestamp: Date.now()
          }
        }
      }
    )
  }

  const hasWorkouts = workouts.length > 0

  // Sort icon component (matching measurements)
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3 w-3 text-white/30" />
    }
    return sortDirection === 'asc'
      ? <ArrowUp className="h-3 w-3 text-emerald-400" />
      : <ArrowDown className="h-3 w-3 text-emerald-400" />
  }

  // Loading state
  if (loading && workouts.length === 0) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="text-center">
          <svg className="animate-spin h-5 w-5 text-white mx-auto mb-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-xs text-white/70">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <section className="mx-auto w-full max-w-3xl px-2 pb-10">
        {/* Action Buttons */}
        <div className="mb-1.5 flex items-center justify-between relative z-10">
          <div></div>
          <div className="flex items-center gap-1">
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

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          {/* Title */}
          <div className="relative overflow-hidden rounded-lg border border-transparent bg-white/5 p-3 backdrop-blur-2xl">
            <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-white/10 blur-2xl opacity-50" />
            <div className="absolute -bottom-12 -left-12 h-32 w-32 rounded-full bg-white/10 blur-2xl opacity-50" />
            
            <div className="relative">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-semibold tracking-tight">Your Workouts</h1>
                  <p className="mt-0.5 text-xs text-white/70">View and manage your workout history</p>
                </div>
              </div>
            </div>
          </div>

          {/* Empty State */}
          {!hasWorkouts && (
            <div className="rounded-md border border-transparent bg-white/5 p-6 text-center backdrop-blur-2xl">
              <Dumbbell className="h-10 w-10 mx-auto text-white/30 mb-2" />
              <h3 className="text-base font-medium text-white mb-1.5">No workouts yet</h3>
              <p className="text-xs text-white/60 mb-3">
                Start your fitness journey by creating or generating your first workout
              </p>
            </div>
          )}

          {/* Workouts Grid */}
          {hasWorkouts && (
            <div className="space-y-2">
              {/* Search and Filter Controls */}
              <div className="rounded-md border border-transparent bg-white/5 backdrop-blur-xl overflow-hidden">
                <div className="p-1.5 border-b border-transparent">
                  {/* Mobile: Stack vertically */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    {/* Search and filter buttons */}
                    <div className="flex items-center gap-1.5">
                      <div className="relative flex-1 sm:flex-initial">
                        <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-white/40" />
                        <input
                          type="text"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          placeholder="Search workouts"
                          className="w-full sm:w-32 md:w-40 rounded-md border border-white/20 bg-white/10 py-1 pl-8 pr-2 text-xs font-light text-white/90 placeholder-white/40 focus:border-white/40 focus:outline-none backdrop-blur-xl"
                        />
                      </div>
                      {hasActiveFilters && (
                        <button
                          onClick={clearFilters}
                          className="flex items-center gap-0.5 rounded border border-white/20 bg-white/10 px-1.5 py-1 text-[11px] font-light text-white/80 hover:bg-white/20 transition-colors"
                        >
                          <X className="h-2.5 w-2.5" strokeWidth={1.5} />
                        </button>
                      )}
                      <button
                        onClick={() => setShowFilters(!showFilters)}
                        className="flex items-center gap-0.5 rounded border border-white/20 bg-white/10 px-2 py-1 text-[11px] font-light text-white/80 hover:bg-white/20 transition-colors"
                      >
                        <Filter className="h-2.5 w-2.5" strokeWidth={1.5} />
                        <span className="hidden sm:inline">Filter</span>
                        {showFilters ? (
                          <ChevronUp className="h-2.5 w-2.5" strokeWidth={1.5} />
                        ) : (
                          <ChevronDown className="h-2.5 w-2.5" strokeWidth={1.5} />
                        )}
                      </button>
                    </div>

                    {/* Sort buttons */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleSortChange('name')}
                        className="flex items-center gap-0.5 rounded border border-white/20 bg-white/10 px-2 py-1 text-[11px] font-light text-white/80 hover:bg-white/20 transition-colors"
                      >
                        <span className="hidden xs:inline">Name</span>
                        <span className="xs:hidden">A-Z</span>
                        <SortIcon field="name" />
                      </button>
                      <button
                        onClick={() => handleSortChange('created_at')}
                        className="flex items-center gap-0.5 rounded border border-white/20 bg-white/10 px-2 py-1 text-[11px] font-light text-white/80 hover:bg-white/20 transition-colors"
                      >
                        <span className="hidden xs:inline">Date</span>
                        <span className="xs:hidden">📅</span>
                        <SortIcon field="created_at" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Filter Panel */}
                {showFilters && (
                  <div className="p-2.5 border-t border-white/10 bg-white/5">
                    <div className="space-y-3">
                      {/* Muscle Focus */}
                      <div>
                        <p className="text-[10px] font-medium text-white/60 mb-1.5">Muscle Focus</p>
                        <div className="flex flex-wrap gap-1.5">
                          {MUSCLE_OPTIONS.map(option => (
                            <button
                              key={option.id}
                              onClick={() => toggleMuscleFilter(option.id)}
                              className={`rounded-full border px-2 py-0.5 text-[10px] font-light transition-colors ${
                                selectedMuscles.includes(option.id)
                                  ? 'border-fuchsia-400/50 bg-fuchsia-500/20 text-fuchsia-200'
                                  : 'border-white/20 bg-white/5 text-white/60 hover:bg-white/10'
                              }`}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Workout Focus */}
                      <div>
                        <p className="text-[10px] font-medium text-white/60 mb-1.5">Workout Focus</p>
                        <div className="flex flex-wrap gap-1.5">
                          {FOCUS_OPTIONS.map(option => (
                            <button
                              key={option.id}
                              onClick={() => toggleFocusFilter(option.id)}
                              className={`rounded-full border px-2 py-0.5 text-[10px] font-light transition-colors ${
                                selectedFocus.includes(option.id)
                                  ? 'border-cyan-400/50 bg-cyan-500/20 text-cyan-200'
                                  : 'border-white/20 bg-white/5 text-white/60 hover:bg-white/10'
                              }`}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Status */}
                      <div>
                        <p className="text-[10px] font-medium text-white/60 mb-1.5">Status</p>
                        <div className="flex flex-wrap gap-1.5">
                          {STATUS_OPTIONS.map(option => (
                            <button
                              key={option.id}
                              onClick={() => toggleStatusFilter(option.id)}
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
                    </div>
                  </div>
                )}
              </div>

              {/* Results count */}
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-white/60">
                  {filteredWorkouts.length} of {workouts.length} {filteredWorkouts.length === 1 ? 'workout' : 'workouts'}
                </p>
              </div>

              {/* Error Display */}
              {error && (
                <div className="p-2 rounded-lg bg-red-500/20 text-red-200 text-xs flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {error}
                </div>
              )}

              {/* Workout List */}
              <WorkoutList
                workouts={workouts}
                filteredWorkouts={filteredWorkouts}
                searchTerm={searchTerm}
                hasActiveFilters={hasActiveFilters}
                onDeleteWorkout={openDeleteModal}
                onClearFilters={clearFilters}
              />
            </div>
          )}
        </motion.div>
      </section>

      {/* Delete Modal */}
      <DeleteWorkoutModal
        open={isDeleteModalOpen}
        isDeleting={isDeleting}
        onCancel={closeDeleteModal}
        onConfirm={() => handleDeleteWorkout(deleteTargetId!)}
      />
    </>
  )
}





