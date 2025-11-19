/**
 * Measurement Status Utilities
 * Calculates status indicators based on value ranges
 */

/**
 * Status indicator types for measurements
 */
export type MeasurementStatus = 'normal' | 'warning' | 'critical' | 'severe';

/**
 * Calculate measurement status based on healthy reference ranges or fallback to min/max values
 */
export function calculateMeasurementStatus(
  value: number,
  healthyRanges?: {
    min_male?: number | null;
    max_male?: number | null;
    min_female?: number | null;
    max_female?: number | null;
  } | null,
  userGender?: 'male' | 'female' | null,
  fallbackRanges?: { min_value?: number | null; max_value?: number | null } | null
): MeasurementStatus {
  // Try healthy ranges first
  if (healthyRanges) {
    // Get the appropriate range based on user gender
    let minValue: number | null = null;
    let maxValue: number | null = null;

    if (userGender === 'male') {
      minValue = healthyRanges.min_male ?? null;
      maxValue = healthyRanges.max_male ?? null;
    } else if (userGender === 'female') {
      minValue = healthyRanges.min_female ?? null;
      maxValue = healthyRanges.max_female ?? null;
    } else {
      // For unknown/other gender, use female ranges as default (more conservative)
      minValue = healthyRanges.min_female ?? null;
      maxValue = healthyRanges.max_female ?? null;
    }

    // If no gender-specific ranges, try opposite gender
    if ((minValue === null || maxValue === null) && userGender === 'male') {
      minValue = healthyRanges.min_female ?? null;
      maxValue = healthyRanges.max_female ?? null;
    } else if ((minValue === null || maxValue === null) && userGender === 'female') {
      minValue = healthyRanges.min_male ?? null;
      maxValue = healthyRanges.max_male ?? null;
    }

    // If we have valid ranges, use them
    if (minValue !== null && maxValue !== null && minValue < maxValue) {
      const rangeWidth = maxValue - minValue;

      // Outside healthy range = critical
      if (value < minValue || value > maxValue) {
        const distanceFromMin = Math.abs(value - minValue);
        const distanceFromMax = Math.abs(value - maxValue);
        const minDistance = Math.min(distanceFromMin, distanceFromMax);

        // If outside by more than 25% of range width, it's severe
        if (minDistance > rangeWidth * 0.25) {
          return 'severe';
        }
        return 'critical';
      }

      // Within healthy range - check if close to boundary (within 10% of range width)
      const distanceFromMin = value - minValue;
      const distanceFromMax = maxValue - value;
      const minDistance = Math.min(distanceFromMin, distanceFromMax);

      if (minDistance <= rangeWidth * 0.1) {
        return 'warning';
      }

      return 'normal';
    }
  }

  // Fallback to old min_value/max_value ranges if available
  if (fallbackRanges && fallbackRanges.min_value != null && fallbackRanges.max_value != null) {
    const minValue = fallbackRanges.min_value;
    const maxValue = fallbackRanges.max_value;

    if (minValue < maxValue) {
      const rangeWidth = maxValue - minValue;

      // Outside range = critical
      if (value < minValue || value > maxValue) {
        const distanceFromMin = Math.abs(value - minValue);
        const distanceFromMax = Math.abs(value - maxValue);
        const minDistance = Math.min(distanceFromMin, distanceFromMax);

        // If outside by more than 25% of range width, it's severe
        if (minDistance > rangeWidth * 0.25) {
          return 'severe';
        }
        return 'critical';
      }

      // Within range - check if close to boundary (within 10% of range width)
      const distanceFromMin = value - minValue;
      const distanceFromMax = maxValue - value;
      const minDistance = Math.min(distanceFromMin, distanceFromMax);

      if (minDistance <= rangeWidth * 0.1) {
        return 'warning';
      }
    }
  }

  // No ranges available, consider normal
  return 'normal';
}

/**
 * Status indicator icons as string-based SVGs
 */
const StatusIcons = {
  normal: '<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>',
  warning: '<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path></svg>',
  critical: '<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>',
  severe: '<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01"></path></svg>'
};

/**
 * Get status icon and styling for UI display
 */
export function getStatusIndicator(status: MeasurementStatus) {
  switch (status) {
    case 'normal':
      return {
        icon: StatusIcons.normal,
        color: 'text-emerald-300',
        bgColor: 'bg-gradient-to-r from-emerald-500/12 to-emerald-400/8',
        borderColor: 'border-emerald-400/25',
        title: 'Within healthy range - excellent!'
      };
    case 'warning':
      return {
        icon: StatusIcons.warning,
        color: 'text-amber-300',
        bgColor: 'bg-gradient-to-r from-amber-500/15 to-amber-400/10',
        borderColor: 'border-amber-400/30',
        title: 'Close to range boundary - monitor this value'
      };
    case 'critical':
      return {
        icon: StatusIcons.critical,
        color: 'text-orange-300',
        bgColor: 'bg-gradient-to-r from-orange-500/15 to-orange-400/10',
        borderColor: 'border-orange-400/30',
        title: 'Outside normal range - consult healthcare provider'
      };
    case 'severe':
      return {
        icon: StatusIcons.severe,
        color: 'text-red-300',
        bgColor: 'bg-gradient-to-r from-red-500/20 to-red-400/15',
        borderColor: 'border-red-400/40',
        title: 'Significantly outside normal range - seek medical attention'
      };
    default:
      return null; // No indicator for normal status
  }
}

/**
 * Get detailed status information for debugging/analysis
 */
export function getStatusDetails(
  value: number,
  healthyRanges?: {
    min_male?: number | null;
    max_male?: number | null;
    min_female?: number | null;
    max_female?: number | null;
  } | null,
  userGender?: 'male' | 'female' | null
) {
  const status = calculateMeasurementStatus(value, healthyRanges, userGender);

  // Determine which range was actually used
  let minValue: number | null = null;
  let maxValue: number | null = null;
  let rangeSource = 'none';

  if (healthyRanges) {
    if (userGender === 'male') {
      minValue = healthyRanges.min_male ?? null;
      maxValue = healthyRanges.max_male ?? null;
      rangeSource = 'male';
    } else if (userGender === 'female') {
      minValue = healthyRanges.min_female ?? null;
      maxValue = healthyRanges.max_female ?? null;
      rangeSource = 'female';
    } else {
      // Default to female ranges
      minValue = healthyRanges.min_female ?? null;
      maxValue = healthyRanges.max_female ?? null;
      rangeSource = 'female_default';
    }

    // Fallback logic
    if ((minValue === null || maxValue === null) && userGender === 'male') {
      minValue = healthyRanges.min_female ?? null;
      maxValue = healthyRanges.max_female ?? null;
      rangeSource = 'female_fallback';
    } else if ((minValue === null || maxValue === null) && userGender === 'female') {
      minValue = healthyRanges.min_male ?? null;
      maxValue = healthyRanges.max_male ?? null;
      rangeSource = 'male_fallback';
    }
  }

  if (minValue === null || maxValue === null) {
    return {
      status,
      hasRange: false,
      rangeWidth: null,
      distanceFromMin: null,
      distanceFromMax: null,
      percentageFromMin: null,
      percentageFromMax: null,
      rangeSource,
      indicator: getStatusIndicator(status)
    };
  }

  const rangeWidth = maxValue - minValue;
  const distanceFromMin = value - minValue;
  const distanceFromMax = maxValue - value;
  const percentageFromMin = (distanceFromMin / rangeWidth) * 100;
  const percentageFromMax = (distanceFromMax / rangeWidth) * 100;

  return {
    status,
    hasRange: true,
    rangeWidth,
    distanceFromMin,
    distanceFromMax,
    percentageFromMin,
    percentageFromMax,
    rangeSource,
    indicator: getStatusIndicator(status)
  };
}
