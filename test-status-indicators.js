/**
 * Test cases for measurement status indicators
 */

// Import the status calculation functions
import { calculateMeasurementStatus, getStatusDetails } from '../lib/measurementStatus';

console.log('Testing Measurement Status Indicators...\n');

// Test cases
const testCases = [
  // Normal cases
  { value: 100, min: 80, max: 120, expected: 'normal', description: 'Normal value within range' },
  { value: 75, min: 80, max: 120, expected: 'critical', description: 'Value below minimum (outside range)' },
  { value: 125, min: 80, max: 120, expected: 'critical', description: 'Value above maximum (outside range)' },

  // Warning cases (within 10% of boundary)
  { value: 88, min: 80, max: 120, expected: 'warning', description: 'Value within 10% of minimum boundary' },
  { value: 112, min: 80, max: 120, expected: 'warning', description: 'Value within 10% of maximum boundary' },

  // Severe cases (more than 25% outside range)
  { value: 50, min: 80, max: 120, expected: 'severe', description: 'Value 37.5% below minimum (>25% outside)' },
  { value: 170, min: 80, max: 120, expected: 'severe', description: 'Value 41.7% above maximum (>25% outside)' },

  // Edge cases
  { value: 100, min: null, max: null, expected: 'normal', description: 'No range defined' },
  { value: 100, min: 100, max: 100, expected: 'normal', description: 'Zero-width range (min = max)' },
  { value: 100, min: 120, max: 80, expected: 'normal', description: 'Invalid range (min > max)' },

  // Boundary cases
  { value: 80, min: 80, max: 120, expected: 'normal', description: 'Exactly at minimum' },
  { value: 120, min: 80, max: 120, expected: 'normal', description: 'Exactly at maximum' },
  { value: 86, min: 80, max: 120, expected: 'normal', description: 'Just outside 10% boundary zone' },
  { value: 114, min: 80, max: 120, expected: 'normal', description: 'Just outside 10% boundary zone' },
];

let passed = 0;
let failed = 0;

testCases.forEach((testCase, index) => {
  const result = calculateMeasurementStatus(testCase.value, testCase.min, testCase.max);
  const details = getStatusDetails(testCase.value, testCase.min, testCase.max);

  const success = result === testCase.expected;

  console.log(`Test ${index + 1}: ${success ? '✅ PASS' : '❌ FAIL'} - ${testCase.description}`);
  console.log(`  Expected: ${testCase.expected}, Got: ${result}`);

  if (!success) {
    console.log(`  Details:`, details);
  }
  console.log('');

  if (success) {
    passed++;
  } else {
    failed++;
  }
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);

if (failed === 0) {
  console.log('🎉 All tests passed!');
} else {
  console.log('⚠️  Some tests failed. Please review the logic.');
}
