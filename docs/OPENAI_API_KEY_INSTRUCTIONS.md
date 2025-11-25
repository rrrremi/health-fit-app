# OpenAI API Key Instructions

## Issue
Your application is currently configured with a project-specific API key (`sk-proj-*`), but the OpenAI Node.js client (v4.0.0+) requires a standard API key (`sk-*`).

## How to Get a Standard OpenAI API Key

1. **Log in to your OpenAI account** at [https://platform.openai.com/](https://platform.openai.com/)

2. **Navigate to API Keys**:
   - Click on your profile icon in the top-right corner
   - Select "API keys" from the dropdown menu
   - Or go directly to [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)

3. **Create a new API key**:
   - Click the "Create new secret key" button
   - Give your key a name (e.g., "Workout App")
   - Click "Create secret key"
   - **Important**: Copy the key immediately as you won't be able to see it again

4. **Update your `.env.local` file**:
   ```
   # OpenAI
   OPENAI_API_KEY=sk-your-new-api-key-here
   ```

5. **Restart your development server** after updating the API key

## API Key Format
- Standard API keys start with `sk-` (e.g., `sk-abcdefg123456...`)
- Project API keys start with `sk-proj-` (e.g., `sk-proj-abcdefg123456...`)

## Security Best Practices
- Never commit your API key to version control
- Set up proper environment variables for different environments
- Consider using API key rotation for production environments
- Set up usage limits in your OpenAI account to prevent unexpected charges

## Troubleshooting
If you continue to experience issues with the API key:
1. Verify the key is correctly copied without any extra spaces
2. Check if your OpenAI account has billing set up
3. Ensure you have sufficient credits or balance for API usage
4. Check the OpenAI status page for any service disruptions: [https://status.openai.com/](https://status.openai.com/)
