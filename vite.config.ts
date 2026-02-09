import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of prefix.
  const env = loadEnv(mode, (process as any).cwd(), '');

  const apiKey = env.API_KEY || process.env.API_KEY;

  if (!apiKey) {
    throw new Error(
      "\n\n❌ MISSING API KEY ❌\n" +
      "The 'API_KEY' environment variable is not defined.\n" +
      "Please create a .env file in the root directory with: API_KEY=your_gemini_api_key\n" +
      "Or set it in your system environment variables.\n"
    );
  }
  
  return {
    plugins: [react()],
    define: {
      // Securely expose the API Key.
      // 1. Check `env.API_KEY` (from .env file or system env loaded by loadEnv)
      // 2. Check `process.env.API_KEY` (direct system env, useful in some Vercel build contexts)
      'process.env.API_KEY': JSON.stringify(apiKey),
      // Polyfill process.env for compatibility, but ensure API_KEY is set above.
      'process.env': {} 
    }
  };
});