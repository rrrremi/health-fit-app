import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { WorkoutListItem } from '@/types/workout';

interface UseWorkoutModalReturn {
  deleteTargetId: string | null;
  isDeleteModalOpen: boolean;
  isDeleting: boolean;
  openDeleteModal: (id: string) => void;
  closeDeleteModal: () => void;
  handleDeleteConfirm: (
    workouts: WorkoutListItem[],
    setWorkouts: React.Dispatch<React.SetStateAction<WorkoutListItem[]>>,
    updateCache: (workouts: WorkoutListItem[]) => void
  ) => Promise<void>;
}

export function useWorkoutModal(): UseWorkoutModalReturn {
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const supabase = createClient();

  const openDeleteModal = (id: string) => {
    setDeleteTargetId(id);
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    if (isDeleting) return;
    setIsDeleteModalOpen(false);
    setDeleteTargetId(null);
  };

  const handleDeleteConfirm = async (
    workouts: WorkoutListItem[],
    setWorkouts: React.Dispatch<React.SetStateAction<WorkoutListItem[]>>,
    updateCache: (workouts: WorkoutListItem[]) => void
  ) => {
    if (!deleteTargetId) return;

    try {
      setIsDeleting(true);

      // Optimistic update: Remove from UI immediately
      const previousWorkouts = workouts;
      setWorkouts((prev: any[]) => prev.filter(w => w.id !== deleteTargetId));

      const { error } = await supabase.from('workouts').delete().eq('id', deleteTargetId);

      if (error) {
        // Rollback on error
        setWorkouts(previousWorkouts);
        throw error;
      }

      // Update cache
      updateCache(workouts.filter(w => w.id !== deleteTargetId));
    } catch (err) {
      console.error('Error deleting workout:', err);
      alert('Failed to delete workout');
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
      setDeleteTargetId(null);
    }
  };

  return {
    deleteTargetId,
    isDeleteModalOpen,
    isDeleting,
    openDeleteModal,
    closeDeleteModal,
    handleDeleteConfirm
  };
}
