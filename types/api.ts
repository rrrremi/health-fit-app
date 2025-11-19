/**
 * API Response Types
 *
 * Strongly typed interfaces for API responses to replace `any` usage
 */

export interface ApiError {
  error: string;
  details?: string[] | string;
  resetAt?: number;
  remaining?: number;
}

export interface MeasurementResponse {
  id: string;
  metric: string;
  value: number;
  unit: string;
  measured_at: string;
  source: string;
  confidence: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface MeasurementDetailResponse {
  metric: string;
  display_name: string;
  measurements: MeasurementPublic[];
  range?: {
    min_value: number;
    max_value: number;
  };
  healthy_range?: {
    min_male?: number;
    max_male?: number;
    min_female?: number;
    max_female?: number;
  };
  trend_summary?: {
    change_pct: number;
    delta_abs: number;
    slope_per_day: number;
    direction: string;
    computed_at: string;
  };
  query_time_ms: number;
}

export interface MeasurementSummaryResponse {
  metrics: MetricSummary[];
  query_time_ms?: number;
}

export interface WorkoutGenerationRequest {
  muscleFocus: string[];
  workoutFocus: string[];
  exerciseCount: number;
  specialInstructions?: string;
  difficulty?: string;
}

export interface WorkoutGenerationResponse {
  success: boolean;
  data?: WorkoutData;
  error?: string;
  rawResponse?: string;
  parseAttempts?: number;
  generationTimeMs?: number;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface HealthAnalysisResponse {
  analysis_id?: string;
  status?: string;
  data?: any; // Keep as any for now since analysis structure is complex
  performance?: {
    total_ms: number;
    db_ms: number;
    ai_ms: number;
    tokens: any;
  };
}

// Import types that are referenced
import type { MeasurementPublic } from './measurements';
import type { MetricSummary } from './measurements';
import type { WorkoutData } from './workout';
