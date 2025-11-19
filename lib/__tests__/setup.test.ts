import { describe, it, expect } from 'vitest';

// Simple placeholder test to ensure the testing setup works
describe('Application Tests Setup', () => {
  it('should have test runner configured', () => {
    expect(true).toBe(true);
  });

  it('should load validation schemas', () => {
    // This will fail if the imports don't work
    const { AnalysisSchema } = require('@/lib/validations/analysis');
    const { WorkoutSchema } = require('@/lib/validations/workout');

    expect(AnalysisSchema).toBeDefined();
    expect(WorkoutSchema).toBeDefined();
  });
});
