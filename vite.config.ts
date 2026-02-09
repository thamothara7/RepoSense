import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  return {
    plugins: [react()],
    define: {
      // Prioritize system env vars (Vercel) over local .env files
      'process.env.API_KEY': JSON.stringify(process.env.API_KEY || env.API_KEY),
      // Prevent "process is not defined" crashes in 3rd party libs
      'process.env': {} 
    }
  };
});