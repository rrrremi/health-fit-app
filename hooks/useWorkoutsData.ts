import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { WorkoutListItem } from '@/types/workout';
import { useCallback } from 'react';

export function useWorkoutsData() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  // 1. Get User & Admin Status
  const { 
    data: userData, 
    isLoading: isUserLoading, 
    error: userError 
  } = useQuery({
    queryKey: ['auth', 'user'],
    queryFn: async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      if (!user) return null;

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();
      
      return { user, isAdmin: !!profile?.is_admin };
    },
    staleTime: 1000 * 60 * 30, // 30 minutes for user session
  });

  // 2. Get Workouts
  const { 
    data: workouts = [], 
    isLoading: isWorkoutsLoading, 
    error: workoutsError,
    refetch
  } = useQuery({
    queryKey: ['workouts', userData?.user?.id],
    enabled: !!userData?.user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workouts')
        .select('id, name, created_at, total_duration_minutes, muscle_focus, workout_focus, workout_data, target_date, status, rating')
        .eq('user_id', userData!.user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as WorkoutListItem[];
    }
  });

  // Legacy adapter to maintain API compatibility
  // The query auto-refetches when enabled, but this allows manual refresh
  const fetchWorkouts = useCallback(async (userId?: string, forceRefresh?: boolean) => {
    // We ignore userId as we use the one from auth state
    // forceRefresh is implicitly true when calling refetch()
    await refetch();
  }, [refetch]);

  return {
    user: userData?.user ?? null,
    isAdmin: userData?.isAdmin ?? false,
    loading: isUserLoading || isWorkoutsLoading,
    error: (userError as Error)?.message || (workoutsError as Error)?.message || null,
    workouts,
    fetchWorkouts
  };
}
