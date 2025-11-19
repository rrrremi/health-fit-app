import OpenAI from 'openai';

// Centralized OpenAI client configuration
// All OpenAI usage should go through this singleton to ensure consistent configuration

let openaiInstance: OpenAI | null = null;

/**
 * Get the singleton OpenAI client instance
 * Ensures consistent configuration across the application
 * Note: This will throw at runtime if OPENAI_API_KEY is not set, but allows builds to succeed
 */
export function getOpenAIClient(): OpenAI {
  if (!openaiInstance) {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not defined in environment variables');
    }

    openaiInstance = new OpenAI({
      apiKey,
      timeout: 60000, // 60 seconds timeout
      maxRetries: 2,  // Retry API calls up to 2 times
      baseURL: "https://api.openai.com/v1", // Explicitly set the base URL
    });
  }

  return openaiInstance;
}

// Don't export a pre-initialized client - this allows builds to succeed without API key
// Export the getter function instead
export default getOpenAIClient;
