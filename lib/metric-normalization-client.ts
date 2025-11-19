// Client-safe metric normalization utilities
// These functions can be used in both server and client code

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
  'neutrophile_count': 'neutrophile_count',
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
 * Validate metric name format
 */
export function validateMetricName(name: string): boolean {
  if (!name || typeof name !== 'string') return false
  const normalized = normalizeMetricName(name)
  return normalized.length > 0 && normalized.length <= 50
}
