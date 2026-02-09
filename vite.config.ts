import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of prefix.
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    plugins: [react()],
    define: {
      // Explicitly stringify the API key. 
      // Vercel exposes system environment variables in process.env during build.
      'process.env.API_KEY': JSON.stringify(env.API_KEY || process.env.API_KEY),
      // Polyfill process.env for third-party libraries that might access it directly.
      'process.env': JSON.stringify({})
    }
  };
});