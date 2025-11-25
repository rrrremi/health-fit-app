/**
 * Sanitization utilities for user input
 */

// Common prompt injection patterns to detect and block
const PROMPT_INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above)/i,
  /disregard\s+(all\s+)?(previous|prior|above)/i,
  /forget\s+(all\s+)?(previous|prior|above)/i,
  /new\s+instructions?/i,
  /system\s*:?\s*prompt/i,
  /you\s+are\s+(now|a)/i,
  /act\s+as\s+(if|a)/i,
  /pretend\s+(to\s+be|you)/i,
  /roleplay\s+as/i,
  /\bDAN\b/i,  // "Do Anything Now" jailbreak
  /jailbreak/i,
  /bypass\s+(filter|safety|restriction)/i,
  /override\s+(instruction|rule|filter)/i,
  /\{\{.*\}\}/,  // Template injection
  /\[\[.*\]\]/,  // Alternative template syntax
  /```[\s\S]*```/,   // Code block injection
];

/**
 * Check if input contains prompt injection attempts
 */
function containsPromptInjection(input: string): boolean {
  return PROMPT_INJECTION_PATTERNS.some(pattern => pattern.test(input));
}

/**
 * Sanitize special instructions to prevent XSS and prompt injection
 * Preserves: letters, numbers, spaces, basic punctuation
 * Removes: HTML tags, script tags, special characters that could be used for injection
 */
export function sanitizeSpecialInstructions(input: string | undefined): string | undefined {
  if (!input || typeof input !== 'string') {
    return undefined;
  }

  // Trim whitespace
  let sanitized = input.trim();

  // Check for prompt injection attempts - if detected, return safe fallback
  if (containsPromptInjection(sanitized)) {
    // Log for monitoring (in production, send to logging service)
    if (process.env.NODE_ENV === 'development') {
      console.warn('[SECURITY] Prompt injection attempt detected:', sanitized.substring(0, 50));
    }
    return undefined; // Block the entire input
  }

  // Remove HTML tags
  sanitized = sanitized.replace(/<[^>]*>/g, '');

  // Remove script-like content
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remove potential SQL injection patterns (though we use parameterized queries)
  sanitized = sanitized.replace(/(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/gi, '');

  // Remove excessive special characters that could be used for prompt injection
  // Keep: letters, numbers, spaces, basic punctuation (.,!?-'":;)
  sanitized = sanitized.replace(/[^\w\s.,!?'\-":;()]/g, '');

  // Limit consecutive special characters
  sanitized = sanitized.replace(/([.,!?'\-":;]){3,}/g, '$1$1');

  // Collapse multiple spaces
  sanitized = sanitized.replace(/\s+/g, ' ');

  // Limit length (already done in API but double-check)
  sanitized = sanitized.substring(0, 140);

  // Return undefined if sanitization resulted in empty string
  return sanitized.trim() || undefined;
}

/**
 * Sanitize workout name
 */
export function sanitizeWorkoutName(input: string | undefined): string {
  if (!input || typeof input !== 'string') {
    return `Workout ${new Date().toLocaleDateString()}`;
  }

  // Remove HTML tags
  let sanitized = input.trim().replace(/<[^>]*>/g, '');

  // Keep only safe characters
  sanitized = sanitized.replace(/[^\w\s\-']/g, '');

  // Limit length
  sanitized = sanitized.substring(0, 100);

  return sanitized.trim() || `Workout ${new Date().toLocaleDateString()}`;
}

/**
 * Sanitize exercise notes
 */
export function sanitizeExerciseNotes(input: string | undefined): string | undefined {
  if (!input || typeof input !== 'string') {
    return undefined;
  }

  // Remove HTML tags
  let sanitized = input.trim().replace(/<[^>]*>/g, '');

  // Keep alphanumeric, spaces, and basic punctuation
  sanitized = sanitized.replace(/[^\w\s.,!?'\-":;()]/g, '');

  // Limit length
  sanitized = sanitized.substring(0, 500);

  return sanitized.trim() || undefined;
}
