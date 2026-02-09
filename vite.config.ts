import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // We no longer expose process.env.API_KEY to the client
    'process.env': {} 
  }
});