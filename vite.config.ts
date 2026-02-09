import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  define: {
    // This polyfill is necessary for the Google GenAI SDK to access process.env.API_KEY in the browser
    'process.env': process.env
  }
});