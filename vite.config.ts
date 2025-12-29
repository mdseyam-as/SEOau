import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 5173,
      host: '0.0.0.0',
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true
        }
      }
    },
    plugins: [react()],
    define: {
      // API keys should NEVER be exposed to frontend
      // All API calls go through backend
    },
    test: {
      globals: true,
      environment: 'jsdom',
      include: ['frontend/tests/**/*.{test,spec}.{ts,tsx}', 'backend/tests/**/*.{test,spec}.{js,ts}'],
      environmentMatchGlobs: [
        ['frontend/tests/**', 'jsdom'],
        ['backend/tests/**', 'node']
      ]
    }
  };
});
