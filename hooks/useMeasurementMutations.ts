import { useState, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import type { MetricDetailResponse, MeasurementPublic, MetricSummary } from '@/types/measurements';

// Type for summary cache data
interface SummaryCache {
  metrics: MetricSummary[];
}

/**
 * Manages measurement mutations (update, delete) with optimistic updates
 * 
 * @param metric - The metric key for cache invalidation
 * @returns Mutation functions and loading states
 */
export function useMeasurementMutations(metric: string) {
  const queryClient = useQueryClient();
  const [deleting, setDeleting] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);
  
  /**
   * Updates a measurement value with optimistic UI update
   */
  const updateMeasurement = async (id: string, newValue: number) => {
    const previousDetailData = queryClient.getQueryData<MetricDetailResponse>([
      'measurements',
      'detail',
      metric,
    ]);
    const previousSummaryData = queryClient.getQueryData(['measurements', 'summary']);
    
    const measurement = previousDetailData?.measurements.find((m) => m.id === id);
    if (!measurement) return;
    
    try {
      // Optimistic update - update UI immediately
      queryClient.setQueryData<MetricDetailResponse>(
        ['measurements', 'detail', metric],
        (old) => {
          if (!old) return old;
          return {
            ...old,
            measurements: old.measurements.map((m) =>
              m.id === id ? { ...m, value: newValue } : m
            ),
          };
        }
      );
      
      // Update summary cache if this is the latest measurement
      queryClient.setQueryData<SummaryCache>(['measurements', 'summary'], (old) => {
        if (!old?.metrics) return old;
        return {
          ...old,
          metrics: old.metrics.map((m) =>
            m.metric === metric && m.latest_date === measurement.measured_at
              ? { ...m, latest_value: newValue }
              : m
          ),
        };
      });
      
      // Make API call in background with abort support
      const payload = {
        value: newValue,
        unit: measurement.unit,
      };
      
      // Cancel any pending request
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();
      
      const response = await fetch(`/api/measurements/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: abortControllerRef.current.signal,
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update');
      }
      
      // Refetch to ensure data consistency
      queryClient.invalidateQueries({ queryKey: ['measurements', 'detail', metric] });
      queryClient.invalidateQueries({ queryKey: ['measurements', 'summary'] });
    } catch (error) {
      // Don't show error for aborted requests
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      
      // Rollback optimistic update on error
      if (previousDetailData) {
        queryClient.setQueryData(['measurements', 'detail', metric], previousDetailData);
      }
      if (previousSummaryData) {
        queryClient.setQueryData(['measurements', 'summary'], previousSummaryData);
      }
      
      toast.error('Failed to update measurement. Changes have been reverted.');
    }
  };
  
  /**
   * Deletes a measurement with optimistic UI update
   * Note: Call confirmDelete first to show confirmation modal
   */
  const deleteMeasurement = async (id: string) => {
    
    const previousDetailData = queryClient.getQueryData<MetricDetailResponse>([
      'measurements',
      'detail',
      metric,
    ]);
    const previousSummaryData = queryClient.getQueryData(['measurements', 'summary']);
    
    try {
      setDeleting(id);
      
      // Optimistic update - remove from UI immediately
      queryClient.setQueryData<MetricDetailResponse>(
        ['measurements', 'detail', metric],
        (old) => {
          if (!old) return old;
          return {
            ...old,
            measurements: old.measurements.filter((m) => m.id !== id),
          };
        }
      );
      
      // Update summary if needed (recalculate latest)
      queryClient.setQueryData<SummaryCache>(['measurements', 'summary'], (old) => {
        if (!old?.metrics) return old;
        
        const remainingMeasurements =
          previousDetailData?.measurements.filter((m) => m.id !== id) || [];
        
        if (remainingMeasurements.length === 0) {
          // Remove metric from summary if no measurements left
          return {
            ...old,
            metrics: old.metrics.filter((m) => m.metric !== metric),
          };
        }
        
        // Update with new latest value
        const latestMeasurement = remainingMeasurements.sort(
          (a, b) => new Date(b.measured_at).getTime() - new Date(a.measured_at).getTime()
        )[0];
        
        return {
          ...old,
          metrics: old.metrics.map((m) =>
            m.metric === metric
              ? {
                  ...m,
                  latest_value: latestMeasurement.value,
                  latest_date: latestMeasurement.measured_at,
                  point_count: remainingMeasurements.length,
                }
              : m
          ),
        };
      });
      
      // Make API call in background with abort support
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();
      
      const response = await fetch(`/api/measurements/${id}`, {
        method: 'DELETE',
        signal: abortControllerRef.current.signal,
      });
      
      if (!response.ok) throw new Error('Failed to delete');
      
      // Refetch to ensure data consistency
      queryClient.invalidateQueries({ queryKey: ['measurements', 'detail', metric] });
      queryClient.invalidateQueries({ queryKey: ['measurements', 'summary'] });
    } catch (error) {
      // Don't show error for aborted requests
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      
      // Rollback optimistic update on error
      if (previousDetailData) {
        queryClient.setQueryData(['measurements', 'detail', metric], previousDetailData);
      }
      if (previousSummaryData) {
        queryClient.setQueryData(['measurements', 'summary'], previousSummaryData);
      }
      
      toast.error('Failed to delete measurement. Changes have been reverted.');
    } finally {
      setDeleting(null);
    }
  };

  /**
   * Request deletion confirmation - sets pending delete ID
   * Use with ConfirmModal component
   */
  const confirmDelete = (id: string) => {
    setPendingDeleteId(id);
  };

  /**
   * Cancel pending deletion
   */
  const cancelDelete = () => {
    setPendingDeleteId(null);
  };

  /**
   * Execute pending deletion after confirmation
   */
  const executeDelete = async () => {
    if (pendingDeleteId) {
      await deleteMeasurement(pendingDeleteId);
      setPendingDeleteId(null);
    }
  };
  
  /**
   * Creates a new measurement with optimistic UI update
   */
  const createMeasurement = async (data: { value: number; measured_at: string; unit: string }) => {
    const previousDetailData = queryClient.getQueryData<MetricDetailResponse>([
      'measurements',
      'detail',
      metric,
    ]);
    const previousSummaryData = queryClient.getQueryData(['measurements', 'summary']);

    // Create optimistic measurement object
    const optimisticMeasurement: MeasurementPublic = {
      id: `temp-${Date.now()}`,
      metric,
      value: data.value,
      unit: data.unit,
      measured_at: data.measured_at,
      source: 'manual',
      confidence: 0.95,
      notes: null,
      image_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      delta_abs: null,
      delta_pct: null,
      trend_direction: undefined,
    };

    try {
      // Optimistic update - add measurement to UI immediately
      queryClient.setQueryData<MetricDetailResponse>(
        ['measurements', 'detail', metric],
        (old) => {
          if (!old) return old;
          return {
            ...old, // Preserve all existing fields including healthy_range
            measurements: [...old.measurements, optimisticMeasurement],
          };
        }
      );

      // Optimistic update for summary - update latest value if this is newer
      queryClient.setQueryData<SummaryCache>(['measurements', 'summary'], (old) => {
        if (!old?.metrics) return old;

        const metricSummary = old.metrics.find((m) => m.metric === metric);
        if (!metricSummary) return old;

        const measurementDate = new Date(data.measured_at);
        const currentLatestDate = new Date(metricSummary.latest_date);

        // Only update if this measurement is newer
        if (measurementDate > currentLatestDate) {
          return {
            ...old,
            metrics: old.metrics.map((m) =>
              m.metric === metric
                ? {
                    ...m, // Preserve all existing fields including healthy ranges
                    latest_value: data.value,
                    latest_date: data.measured_at,
                    point_count: m.point_count + 1,
                  }
                : m
            ),
          };
        }

        // Just increment count if not the latest
        return {
          ...old,
          metrics: old.metrics.map((m) =>
            m.metric === metric
              ? { ...m, point_count: m.point_count + 1 } // Preserve all existing fields
              : m
          ),
        };
      });

      // Make API call in background
      const payload = {
        metric,
        value: data.value,
        unit: data.unit,
        measured_at: data.measured_at,
        source: 'manual',
        confidence: 0.95,
      };

      // Cancel any pending request
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();
      
      const response = await fetch('/api/measurements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create measurement');
      }

      // Refetch to ensure data consistency and replace temp data
      await queryClient.invalidateQueries({ queryKey: ['measurements', 'detail', metric] });
      await queryClient.invalidateQueries({ queryKey: ['measurements', 'summary'] });

      toast.success('Measurement added successfully');
    } catch (error) {
      // Don't show error for aborted requests
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }

      // Rollback optimistic update on error
      if (previousDetailData) {
        queryClient.setQueryData(['measurements', 'detail', metric], previousDetailData);
      }
      if (previousSummaryData) {
        queryClient.setQueryData(['measurements', 'summary'], previousSummaryData);
      }

      toast.error('Failed to add measurement');
      throw error;
    }
  };
  
  return {
    updateMeasurement,
    deleteMeasurement,
    createMeasurement,
    deleting,
    // New confirmation-based delete API
    pendingDeleteId,
    confirmDelete,
    cancelDelete,
    executeDelete,
  };
}
