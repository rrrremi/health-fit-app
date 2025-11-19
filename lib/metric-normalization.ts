import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// Canonical metric mappings - common variations
const METRIC_SYNONYMS: Record<string, string> = {
  // Weight
  'weight': 'weight',
  'body_weight': 'weight',
  'bodyweight': 'weight',
  'mass': 'weight',

  // Height
  'height': 'height',
  'body_height': 'height',
  'stature': 'height',

  // BMI
  'bmi': 'bmi',
  'body_mass_index': 'bmi',

  // Body Fat
  'body_fat_percent': 'body_fat_percent',
  'body_fat_percentage': 'body_fat_percent',
  'body_fat': 'body_fat_percent',
  'fat_percentage': 'body_fat_percent',
  'bodyfat': 'body_fat_percent',

  // Blood Pressure
  'systolic_blood_pressure': 'blood_pressure_systolic',
  'diastolic_blood_pressure': 'blood_pressure_diastolic',
  'systolic': 'blood_pressure_systolic',
  'diastolic': 'blood_pressure_diastolic',
  'blood_pressure_sys': 'blood_pressure_systolic',
  'blood_pressure_dia': 'blood_pressure_diastolic',

  // Cholesterol
  'total_cholesterol': 'cholesterol_total',
  'cholesterol': 'cholesterol_total',
  'hdl_cholesterol': 'cholesterol_hdl',
  'ldl_cholesterol': 'cholesterol_ldl',
  'triglycerides': 'triglycerides',
  'hdl': 'cholesterol_hdl',
  'ldl': 'cholesterol_ldl',
  'triglyceride': 'triglycerides',

  // Glucose/Blood Sugar
  'glucose': 'glucose',
  'blood_glucose': 'glucose',
  'blood_sugar': 'glucose',
  'fasting_glucose': 'glucose',

  // Hemoglobin
  'hemoglobin': 'hemoglobin',
  'hb': 'hemoglobin',
  'hgb': 'hemoglobin',

  // Hematocrit
  'hematocrit': 'hematocrit',
  'hct': 'hematocrit',

  // White Blood Cells
  'white_blood_cell_count': 'wbc_count',
  'white_blood_cells': 'wbc_count',
  'wbc': 'wbc_count',
  'leukocytes': 'wbc_count',

  // Red Blood Cells
  'red_blood_cell_count': 'rbc_count',
  'red_blood_cells': 'rbc_count',
  'rbc': 'rbc_count',
  'erythrocytes': 'rbc_count',

  // Platelets
  'platelet_count': 'platelet_count',
  'platelets': 'platelet_count',
  'thrombocytes': 'platelet_count',

  // Basophils (example from user's question)
  'basophil_count': 'basophil_count',
  'basophile_count': 'basophil_count',
  'basophils': 'basophil_count',
  'basophile_number': 'basophil_count',
  'basophile': 'basophil_count',

  // Similar patterns for other cell types
  'eosinophil_count': 'eosinophil_count',
  'eosinophile_count': 'eosinophil_count',
  'neutrophil_count': 'neutrophil_count',
  'neutrophile_count': 'neutrophil_count',
  'lymphocyte_count': 'lymphocyte_count',
  'lymphocyte': 'lymphocyte_count',
  'monocyte_count': 'monocyte_count',
  'monocyte': 'monocyte_count',
};

/**
 * Advanced metric name normalization
 * Converts various formats to canonical snake_case
 */
export function normalizeMetricName(rawName: string): string {
  if (!rawName || typeof rawName !== 'string') return '';

  let normalized = rawName.toLowerCase().trim();

  // Remove special characters and extra spaces
  normalized = normalized.replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();

  // Check against known synonyms first
  if (METRIC_SYNONYMS[normalized]) {
    return METRIC_SYNONYMS[normalized];
  }

  // Advanced normalization for unknown metrics
  // Convert spaces and special chars to underscores
  normalized = normalized.replace(/[\s\-\/]+/g, '_');

  // Handle common abbreviations
  const abbreviations: Record<string, string> = {
    'hb': 'hemoglobin',
    'hgb': 'hemoglobin',
    'hct': 'hematocrit',
    'wbc': 'white_blood_cell',
    'rbc': 'red_blood_cell',
    'plt': 'platelet',
    'sys': 'systolic',
    'dia': 'diastolic',
    'bmi': 'body_mass_index',
    'hdl': 'cholesterol_hdl',
    'ldl': 'cholesterol_ldl',
    'tg': 'triglycerides',
    'tc': 'cholesterol_total'
  };

  // Replace abbreviations
  Object.entries(abbreviations).forEach(([abbr, full]) => {
    const regex = new RegExp(`\\b${abbr}\\b`, 'g');
    normalized = normalized.replace(regex, full);
  });

  // Remove duplicate underscores
  normalized = normalized.replace(/_+/g, '_').replace(/^_|_$/g, '');

  return normalized;
}

/**
 * Calculate similarity between two strings using Levenshtein distance
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));

  for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= b.length; j++) matrix[j][0] = j;

  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,     // deletion
        matrix[j - 1][i] + 1,     // insertion
        matrix[j - 1][i - 1] + indicator // substitution
      );
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Calculate similarity score (0-1, where 1 is identical)
 */
function calculateSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1;

  const maxLen = Math.max(str1.length, str2.length);
  if (maxLen === 0) return 1;

  const distance = levenshteinDistance(str1, str2);
  return 1 - (distance / maxLen);
}

/**
 * Find potential duplicates in existing measurements
 */
export async function findPotentialDuplicates(
  userId: string,
  measurements: Array<{ metric: string; value: number; unit: string }>,
  supabase: any
): Promise<Array<{
  extracted: { metric: string; value: number; unit: string; index: number };
  existing: { metric: string; display_name: string; latest_value: number; unit: string };
  similarity: number;
  confidence: 'high' | 'medium' | 'low';
}>> {
  const duplicates: Array<{
    extracted: { metric: string; value: number; unit: string; index: number };
    existing: { metric: string; display_name: string; latest_value: number; unit: string };
    similarity: number;
    confidence: 'high' | 'medium' | 'low';
  }> = [];

  // Get user's existing metrics
  const { data: existingMetrics } = await supabase
    .from('measurements_summary')
    .select('metric, display_name, latest_value, unit')
    .eq('user_id', userId);

  if (!existingMetrics) return duplicates;

  // Check each extracted measurement against existing ones
  measurements.forEach((extracted, index) => {
    existingMetrics.forEach((existing: any) => {
      // Skip if units don't match (basic check)
      if (extracted.unit !== existing.unit) return;

      // Calculate similarity between normalized names
      const similarity = calculateSimilarity(
        normalizeMetricName(extracted.metric),
        normalizeMetricName(existing.metric)
      );

      // Only flag as potential duplicate if similarity is high enough
      if (similarity >= 0.8) {
        let confidence: 'high' | 'medium' | 'low' = 'low';

        if (similarity >= 0.95) confidence = 'high';
        else if (similarity >= 0.85) confidence = 'medium';

        duplicates.push({
          extracted: { ...extracted, index },
          existing,
          similarity,
          confidence
        });
      }
    });
  });

  // Sort by similarity (highest first) and confidence
  return duplicates.sort((a, b) => {
    if (a.confidence !== b.confidence) {
      const order = { high: 3, medium: 2, low: 1 };
      return order[b.confidence] - order[a.confidence];
    }
    return b.similarity - a.similarity;
  });
}

/**
 * Apply normalization and deduplication to extracted measurements
 */
export async function processAndDeduplicateMeasurements(
  userId: string,
  rawMeasurements: Array<{ metric: string; value: number; unit: string; raw_text?: string; confidence?: number }>,
  supabase: any
): Promise<{
  processed: Array<{ metric: string; value: number; unit: string; raw_text?: string; confidence?: number; normalized_from?: string }>;
  duplicates: Array<{
    extracted: { metric: string; value: number; unit: string; index: number };
    existing: { metric: string; display_name: string; latest_value: number; unit: string };
    similarity: number;
    confidence: 'high' | 'medium' | 'low';
  }>;
  warnings: string[];
}> {
  const warnings: string[] = [];
  const processed: Array<{ metric: string; value: number; unit: string; raw_text?: string; confidence?: number; normalized_from?: string }> = [];

  // First pass: normalize all metric names
  const normalizedMeasurements = rawMeasurements.map(m => ({
    ...m,
    normalized_metric: normalizeMetricName(m.metric),
    original_metric: m.metric
  }));

  // Find duplicates within the extracted set (same normalized name)
  const groupedByNormalized = new Map<string, typeof normalizedMeasurements>();
  normalizedMeasurements.forEach(m => {
    const key = m.normalized_metric;
    if (!groupedByNormalized.has(key)) {
      groupedByNormalized.set(key, []);
    }
    groupedByNormalized.get(key)!.push(m);
  });

  // Handle duplicates within extraction
  groupedByNormalized.forEach((group, normalizedName) => {
    if (group.length > 1) {
      // Take the one with highest confidence, warn about duplicates
      const sortedByConfidence = group.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
      const winner = sortedByConfidence[0];

      processed.push({
        metric: winner.normalized_metric,
        value: winner.value,
        unit: winner.unit,
        raw_text: winner.raw_text,
        confidence: winner.confidence,
        normalized_from: winner.original_metric
      });

      warnings.push(`Multiple extractions for "${normalizedName}" - kept highest confidence value (${winner.value} ${winner.unit})`);
    } else {
      const item = group[0];
      processed.push({
        metric: item.normalized_metric,
        value: item.value,
        unit: item.unit,
        raw_text: item.raw_text,
        confidence: item.confidence,
        normalized_from: item.original_metric !== item.normalized_metric ? item.original_metric : undefined
      });
    }
  });

  // Find potential duplicates with existing measurements
  const duplicates = await findPotentialDuplicates(userId, processed, supabase);

  return {
    processed,
    duplicates,
    warnings
  };
}
