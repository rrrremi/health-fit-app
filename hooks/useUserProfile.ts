import { useQuery } from '@tanstack/react-query';

/**
 * Get user profile information including gender
 */
export function useUserProfile() {
  return useQuery({
    queryKey: ['user', 'profile'],
    queryFn: async () => {
      const response = await fetch('/api/user/profile');
      if (!response.ok) {
        throw new Error('Failed to fetch user profile');
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
