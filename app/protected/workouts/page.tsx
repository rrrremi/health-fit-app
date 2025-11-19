'use client'

import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { AlertCircle } from 'lucide-react'
import { WorkoutListItem } from '@/types/workout'
import { useWorkoutsData } from '@/hooks/useWorkoutsData'
import { useWorkoutFilters } from '@/hooks/useWorkoutFilters'
import { useWorkoutModal } from '@/hooks/useWorkoutModal'
import DeleteWorkoutModal from '@/components/workout/DeleteWorkoutModal'
import WorkoutHeader, { WorkoutActions } from '@/components/workout/WorkoutHeader'
import WorkoutFilters from '@/components/workout/WorkoutFilters'
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
        // Update local state
        // Note: This would need to be passed down from useWorkoutsData hook
        // For now, we'll trigger a refetch
        fetchWorkouts(user?.id || '', true)
      },
      (updatedWorkouts) => {
        // Update cache
        if (workoutsCacheRef.current) {
          workoutsCacheRef.current = {
            workouts: updatedWorkouts,
            timestamp: Date.now()
          }
        }
      }
    )
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
        <WorkoutActions />

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-3"
        >
          {/* Header */}
          <WorkoutHeader />

          {/* Main Content Container */}
          <div className="rounded-lg border border-transparent bg-white/5 backdrop-blur-xl overflow-hidden">
            {/* Filters and Controls */}
            {workouts.length > 0 && (
              <WorkoutFilters
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                showFilters={showFilters}
                onToggleFilters={() => setShowFilters(!showFilters)}
                hasActiveFilters={hasActiveFilters}
                onClearFilters={clearFilters}
                sortField={sortField}
                sortDirection={sortDirection}
                onSortChange={handleSortChange}
                selectedMuscles={selectedMuscles}
                onToggleMuscle={toggleMuscleFilter}
                selectedFocus={selectedFocus}
                onToggleFocus={toggleFocusFilter}
                selectedStatuses={selectedStatuses}
                onToggleStatus={toggleStatusFilter}
              />
            )}

            {/* Error Display */}
            {error && (
              <div className="p-2">
                <div className="mb-2 p-2 rounded-lg bg-red-500/20 text-red-200 text-xs flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {error}
                </div>
              </div>
            )}

            {/* Workout List */}
            <div className="p-2">
              <WorkoutList
                workouts={workouts}
                filteredWorkouts={filteredWorkouts}
                searchTerm={searchTerm}
                hasActiveFilters={hasActiveFilters}
                onDeleteWorkout={openDeleteModal}
              />
            </div>
          </div>
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





