/**
 * Environment variable validation
 * Validates required environment variables at startup
 */

const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
] as const;

const optionalEnvVars = [
  'OPENAI_API_KEY', // Only needed for AI features
  'NEXT_PUBLIC_APP_URL',
] as const;

export function validateEnv() {
  const missing: string[] = [];
  const warnings: string[] = [];

  // Check required variables
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      missing.push(envVar);
    }
  }

  // Check optional variables (just warn)
  for (const envVar of optionalEnvVars) {
    if (!process.env[envVar]) {
      warnings.push(envVar);
    }
  }

  // Fail fast if required vars are missing
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(v => console.error(`   - ${v}`));
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Warn about optional vars
  if (warnings.length > 0 && process.env.NODE_ENV === 'development') {
    console.warn('⚠️  Optional environment variables not set:');
    warnings.forEach(v => console.warn(`   - ${v}`));
  }

  // Success message in development
  if (process.env.NODE_ENV === 'development') {
    console.log('✅ Environment variables validated');
  }
}

// Auto-validate on import (runs at startup)
if (typeof window === 'undefined') {
  // Only run on server-side
  try {
    validateEnv();
  } catch (error) {
    console.error('Environment validation failed:', error);
    process.exit(1);
  }
}
