// vite.config.ts

import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react-swc';

export default defineConfig(({ mode }) => {
  // Load environment variables based on the current mode (e.g., development, e2e)
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const apiUrl = env.VITE_API_URL;

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target: apiUrl, // e.g., http://backend:5001/api
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },
  };
});
