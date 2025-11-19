/**
 * Shared health status calculation logic
 * Used by both summary and detail APIs
 */

export type HealthStatus = 'healthy' | 'near_boundary' | 'moderately_exceeded' | 'critically_exceeded';

export interface HealthRanges {
  healthyMin: number | null;
  healthyMax: number | null;
  validationMin: number | null;
  validationMax: number | null;
}

/**
 * Calculate health status based on 4-tier system with percentage-based margins
 * 
 * @param value - The measurement value to evaluate
 * @param ranges - The healthy and validation ranges
 * @returns Health status or null if no ranges available
 */
export function calculateHealthStatus(
  value: number,
  ranges: HealthRanges
): HealthStatus | null {
  // Use healthy ranges if available
  let min = ranges.healthyMin;
  let max = ranges.healthyMax;
  
  // Fallback to validation ranges if healthy ranges not defined
  if (min === null || max === null) {
    min = ranges.validationMin;
    max = ranges.validationMax;
  }
  
  // If still no ranges, return null
  if (min === null || max === null) {
    return null;
  }
  
  const range = max - min;
  const margin10 = range * 0.1; // 10% margin for healthy zone
  const margin50 = range * 0.5; // 50% margin for moderate zone
  
  // Green: within 10% margin from boundaries (healthy zone)
  const innerMin = min + margin10;
  const innerMax = max - margin10;
  if (value >= innerMin && value <= innerMax) {
    return 'healthy';
  }
  
  // Yellow: within the original range but near boundaries
  if (value >= min && value <= max) {
    return 'near_boundary';
  }
  
  // Orange: beyond range but within 50% extension
  const outerMin = min - margin50;
  const outerMax = max + margin50;
  if (value >= outerMin && value <= outerMax) {
    return 'moderately_exceeded';
  }
  
  // Red: way beyond 50% extension
  return 'critically_exceeded';
}

/**
 * Get color hex code for health status
 */
export function getHealthStatusColor(status: HealthStatus | null | undefined): string | null {
  switch (status) {
    case 'healthy': return '#34d399'; // green
    case 'near_boundary': return '#fbbf24'; // yellow
    case 'moderately_exceeded': return '#f97316'; // orange
    case 'critically_exceeded': return '#ef4444'; // red
    default: return null;
  }
}
