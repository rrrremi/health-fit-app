import OpenAI from 'openai';

// Centralized OpenAI client configuration
// All OpenAI usage should go through this singleton to ensure consistent configuration

let openaiInstance: OpenAI | null = null;

/**
 * Get the singleton OpenAI client instance
 * Ensures consistent configuration across the application
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

// Export the client for direct usage in modules that need it
export const openai = getOpenAIClient();
