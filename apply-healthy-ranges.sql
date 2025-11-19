-- Apply healthy ranges to metrics_catalog
-- Run this in your Supabase SQL Editor

-- First, add the columns if they don't exist
ALTER TABLE metrics_catalog 
ADD COLUMN IF NOT EXISTS healthy_min_male FLOAT,
ADD COLUMN IF NOT EXISTS healthy_max_male FLOAT,
ADD COLUMN IF NOT EXISTS healthy_min_female FLOAT,
ADD COLUMN IF NOT EXISTS healthy_max_female FLOAT;

-- Body Composition
UPDATE metrics_catalog SET
  healthy_min_male = 18.5, healthy_max_male = 24.9,
  healthy_min_female = 18.5, healthy_max_female = 24.9
WHERE key = 'bmi';

UPDATE metrics_catalog SET
  healthy_min_male = 10, healthy_max_male = 20,
  healthy_min_female = 18, healthy_max_female = 28
WHERE key = 'body_fat_percent';

UPDATE metrics_catalog SET
  healthy_min_male = 50, healthy_max_male = 75,
  healthy_min_female = 50, healthy_max_female = 75
WHERE key = 'body_water_percent';

-- Blood Lipids
UPDATE metrics_catalog SET
  healthy_min_male = 125, healthy_max_male = 200,
  healthy_min_female = 125, healthy_max_female = 200
WHERE key = 'cholesterol_total';

UPDATE metrics_catalog SET
  healthy_min_male = 40, healthy_max_male = 60,
  healthy_min_female = 50, healthy_max_female = 70
WHERE key = 'cholesterol_hdl';

UPDATE metrics_catalog SET
  healthy_min_male = 0, healthy_max_male = 100,
  healthy_min_female = 0, healthy_max_female = 100
WHERE key = 'cholesterol_ldl';

UPDATE metrics_catalog SET
  healthy_min_male = 0, healthy_max_male = 130,
  healthy_min_female = 0, healthy_max_female = 130
WHERE key = 'cholesterol_non_hdl';

UPDATE metrics_catalog SET
  healthy_min_male = 0, healthy_max_male = 150,
  healthy_min_female = 0, healthy_max_female = 150
WHERE key = 'triglycerides';

-- Blood Sugar
UPDATE metrics_catalog SET
  healthy_min_male = 70, healthy_max_male = 100,
  healthy_min_female = 70, healthy_max_female = 100
WHERE key = 'glucose';

UPDATE metrics_catalog SET
  healthy_min_male = 4.0, healthy_max_male = 5.6,
  healthy_min_female = 4.0, healthy_max_female = 5.6
WHERE key = 'hba1c';

-- Blood Cells
UPDATE metrics_catalog SET
  healthy_min_male = 13.5, healthy_max_male = 17.5,
  healthy_min_female = 12.0, healthy_max_female = 15.5
WHERE key = 'hemoglobin';

UPDATE metrics_catalog SET
  healthy_min_male = 40, healthy_max_male = 54,
  healthy_min_female = 36, healthy_max_female = 48
WHERE key = 'hematocrit';

UPDATE metrics_catalog SET
  healthy_min_male = 4.5, healthy_max_male = 5.9,
  healthy_min_female = 4.0, healthy_max_female = 5.2
WHERE key = 'red_blood_cells';

UPDATE metrics_catalog SET
  healthy_min_male = 3.5, healthy_max_male = 10.5,
  healthy_min_female = 3.5, healthy_max_female = 10.5
WHERE key = 'white_blood_cells';

UPDATE metrics_catalog SET
  healthy_min_male = 150, healthy_max_male = 450,
  healthy_min_female = 150, healthy_max_female = 450
WHERE key = 'platelets';

-- Blood Pressure
UPDATE metrics_catalog SET
  healthy_min_male = 90, healthy_max_male = 120,
  healthy_min_female = 90, healthy_max_female = 120
WHERE key = 'blood_pressure_systolic';

UPDATE metrics_catalog SET
  healthy_min_male = 60, healthy_max_male = 80,
  healthy_min_female = 60, healthy_max_female = 80
WHERE key = 'blood_pressure_diastolic';

-- Vitals
UPDATE metrics_catalog SET
  healthy_min_male = 60, healthy_max_male = 100,
  healthy_min_female = 60, healthy_max_female = 100
WHERE key = 'heart_rate';

UPDATE metrics_catalog SET
  healthy_min_male = 95, healthy_max_male = 100,
  healthy_min_female = 95, healthy_max_female = 100
WHERE key = 'oxygen_saturation';

UPDATE metrics_catalog SET
  healthy_min_male = 36.1, healthy_max_male = 37.2,
  healthy_min_female = 36.1, healthy_max_female = 37.2
WHERE key = 'body_temperature';

-- Liver Function
UPDATE metrics_catalog SET
  healthy_min_male = 7, healthy_max_male = 56,
  healthy_min_female = 7, healthy_max_female = 56
WHERE key = 'alt';

UPDATE metrics_catalog SET
  healthy_min_male = 10, healthy_max_male = 40,
  healthy_min_female = 10, healthy_max_female = 40
WHERE key = 'ast';

-- Kidney Function
UPDATE metrics_catalog SET
  healthy_min_male = 0.7, healthy_max_male = 1.3,
  healthy_min_female = 0.6, healthy_max_female = 1.1
WHERE key = 'creatinine';

UPDATE metrics_catalog SET
  healthy_min_male = 6, healthy_max_male = 24,
  healthy_min_female = 6, healthy_max_female = 24
WHERE key = 'bun';

-- Thyroid
UPDATE metrics_catalog SET
  healthy_min_male = 0.4, healthy_max_male = 4.0,
  healthy_min_female = 0.4, healthy_max_female = 4.0
WHERE key = 'tsh';

UPDATE metrics_catalog SET
  healthy_min_male = 80, healthy_max_male = 180,
  healthy_min_female = 80, healthy_max_female = 180
WHERE key = 't3';

UPDATE metrics_catalog SET
  healthy_min_male = 5, healthy_max_male = 12,
  healthy_min_female = 5, healthy_max_female = 12
WHERE key = 't4';

-- Hormones
UPDATE metrics_catalog SET
  healthy_min_male = 270, healthy_max_male = 1070,
  healthy_min_female = 15, healthy_max_female = 70
WHERE key = 'testosterone';

UPDATE metrics_catalog SET
  healthy_min_male = 5, healthy_max_male = 25,
  healthy_min_female = 5, healthy_max_female = 25
WHERE key = 'cortisol';

UPDATE metrics_catalog SET
  healthy_min_male = 10, healthy_max_male = 50,
  healthy_min_female = 10, healthy_max_female = 400
WHERE key = 'estradiol';

-- Vitamins & Minerals
UPDATE metrics_catalog SET
  healthy_min_male = 30, healthy_max_male = 100,
  healthy_min_female = 30, healthy_max_female = 100
WHERE key = 'vitamin_d';

UPDATE metrics_catalog SET
  healthy_min_male = 200, healthy_max_male = 900,
  healthy_min_female = 200, healthy_max_female = 900
WHERE key = 'vitamin_b12';

UPDATE metrics_catalog SET
  healthy_min_male = 60, healthy_max_male = 170,
  healthy_min_female = 60, healthy_max_female = 170
WHERE key = 'iron';

UPDATE metrics_catalog SET
  healthy_min_male = 8.5, healthy_max_male = 10.5,
  healthy_min_female = 8.5, healthy_max_female = 10.5
WHERE key = 'calcium';
